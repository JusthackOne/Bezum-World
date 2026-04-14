import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskType, type Task, type TaskSubmission } from '@prisma/client';

import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { AccountRepository } from '../auth/repositories';
import type {
  AdminDeleteTaskResponseDto,
  AdminTasksListResponseDto,
  ClientTaskResponseDto,
  ClientTasksListResponseDto,
  CreateTaskDto,
  GetAdminTasksQueryDto,
  GetClientTasksQueryDto,
  SubmitTaskDto,
  SubmitTaskResponseDto,
  TaskResponseDto,
  TaskRewardAttributesDto,
  TaskSubmissionResponseDto,
  UpdateTaskDto,
  UserTaskSubmissionsResponseDto,
} from './dto';
import { TaskRepository, TaskSubmissionRepository, type UpdateTaskInput } from './repositories';
import type { TaskRewardAttributes } from './types/task-reward-attributes.type';
import { PrismaService } from '../../database/prisma/prisma.service';

const DEFAULT_ADMIN_TASKS_PAGE = 1;
const DEFAULT_ADMIN_TASKS_LIMIT = 20;
const DEFAULT_DAILY_SUBMISSION_LIMIT = 1;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskRepository: TaskRepository,
    private readonly taskSubmissionRepository: TaskSubmissionRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  async createTaskByAdmin(payload: CreateTaskDto): Promise<TaskResponseDto> {
    const createdTask = await this.taskRepository.create({
      type: payload.type,
      title: payload.title,
      description: this.normalizeNullableString(payload.description),
      image: this.normalizeNullableString(payload.image),
      rewardMoney: payload.rewardMoney,
      rewardGameScore: payload.rewardGameScore ?? null,
      rewardAttributes: this.toRewardAttributesJson(payload.rewardAttributes),
      requiresProofImage: payload.requiresProofImage,
      submissionLimit: this.resolveSubmissionLimit(payload.type, payload.submissionLimit, null),
    });

    return this.toTaskResponse(createdTask);
  }

  async createTaskByAdminWithUploadedImage(
    payload: CreateTaskDto,
    uploadedImageUrl?: string,
  ): Promise<TaskResponseDto> {
    return this.createTaskByAdmin({
      ...payload,
      ...(uploadedImageUrl ? { image: uploadedImageUrl } : {}),
    });
  }

  async updateTaskByAdmin(
    taskId: string,
    payload: UpdateTaskDto,
    uploadedImageUrl?: string,
  ): Promise<TaskResponseDto> {
    const existingTask = await this.taskRepository.findById(taskId);

    if (!existingTask) {
      throw new NotFoundException('Task is not found');
    }

    if (!this.hasTaskUpdatePayload(payload)) {
      throw new BadRequestException('At least one field must be provided');
    }

    const nextTaskType = payload.type ?? existingTask.type;
    const updateInput: UpdateTaskInput = {
      ...(payload.type !== undefined ? { type: payload.type } : {}),
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined
        ? { description: this.normalizeNullableString(payload.description) }
        : {}),
      ...(payload.image !== undefined ? { image: this.normalizeNullableString(payload.image) } : {}),
      ...(uploadedImageUrl !== undefined ? { image: uploadedImageUrl } : {}),
      ...(payload.rewardMoney !== undefined ? { rewardMoney: payload.rewardMoney } : {}),
      ...(payload.rewardGameScore !== undefined
        ? { rewardGameScore: payload.rewardGameScore }
        : {}),
      ...(payload.rewardAttributes !== undefined
        ? { rewardAttributes: this.toRewardAttributesJson(payload.rewardAttributes) }
        : {}),
      ...(payload.requiresProofImage !== undefined
        ? { requiresProofImage: payload.requiresProofImage }
        : {}),
      ...(payload.type !== undefined || payload.submissionLimit !== undefined
        ? {
            submissionLimit: this.resolveSubmissionLimit(
              nextTaskType,
              payload.submissionLimit,
              existingTask.submissionLimit,
            ),
          }
        : {}),
    };

    const updatedTask = await this.taskRepository.updateById(taskId, updateInput);

    return this.toTaskResponse(updatedTask);
  }

  async deleteTaskByAdmin(taskId: string): Promise<AdminDeleteTaskResponseDto> {
    const wasDeleted = await this.taskRepository.deleteById(taskId);

    if (!wasDeleted) {
      throw new NotFoundException('Task is not found');
    }

    return {
      message: 'Task deleted',
      taskId,
    };
  }

  async getAdminTasks(query: GetAdminTasksQueryDto): Promise<AdminTasksListResponseDto> {
    const page = query.page ?? DEFAULT_ADMIN_TASKS_PAGE;
    const limit = query.limit ?? DEFAULT_ADMIN_TASKS_LIMIT;
    const skip = (page - 1) * limit;

    const tasksResult = await this.taskRepository.findManyForAdmin({
      ...(query.search !== undefined ? { search: query.search } : {}),
      ...(query.type !== undefined ? { type: query.type } : {}),
      skip,
      take: limit,
    });

    return {
      items: tasksResult.items.map((task) => this.toTaskResponse(task)),
      page,
      limit,
      total: tasksResult.total,
      totalPages: tasksResult.total === 0 ? 0 : Math.ceil(tasksResult.total / limit),
    };
  }

  async getTaskByIdByAdmin(taskId: string): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task is not found');
    }

    return this.toTaskResponse(task);
  }

  async getClientTasksByUser(
    userId: string,
    query: GetClientTasksQueryDto,
  ): Promise<ClientTasksListResponseDto> {
    const account = await this.accountRepository.findById(userId);

    if (!account) {
      throw new NotFoundException('User is not found');
    }

    const now = new Date();
    const dailyRange = this.getUtcDayRange(now);
    const weeklyRange = this.getUtcIsoWeekRange(now);

    const [tasks, completedEventTaskIds, dailySubmissionCounts, weeklySubmissionCounts] =
      await Promise.all([
        this.taskRepository.findManyForClient({
          ...(query.search !== undefined ? { search: query.search } : {}),
          ...(query.type !== undefined ? { type: query.type } : {}),
        }),
        this.taskSubmissionRepository.findCompletedEventTaskIds(),
        this.taskSubmissionRepository.countByTaskGroupedForUserInRange(
          userId,
          dailyRange.start,
          dailyRange.end,
        ),
        this.taskSubmissionRepository.countByTaskGroupedForUserInRange(
          userId,
          weeklyRange.start,
          weeklyRange.end,
        ),
      ]);

    return {
      items: tasks.map((task) =>
        this.toClientTaskResponse(
          task,
          completedEventTaskIds,
          dailySubmissionCounts,
          weeklySubmissionCounts,
        ),
      ),
    };
  }

  async submitTask(taskId: string, userId: string, payload: SubmitTaskDto): Promise<SubmitTaskResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const account = await this.accountRepository.findByIdInTransaction(userId, tx);

      if (!account) {
        throw new NotFoundException('User is not found');
      }

      const task = await this.taskRepository.findByIdForUpdate(taskId, tx);

      if (!task) {
        throw new NotFoundException('Task is not found');
      }

      const proofImage = this.normalizeNullableString(payload.proofImage);

      if (task.requiresProofImage && !proofImage) {
        throw new BadRequestException('Proof image is required for this task');
      }

      const now = new Date();
      await this.ensureSubmissionAllowed(task, userId, now, tx);

      const submission = await this.taskSubmissionRepository.create(
        {
          taskId: task.id,
          userId,
          proofImage,
          grantedGameScore: task.rewardGameScore ?? 0,
        },
        tx,
      );

      const rewardAttributes = this.fromRewardAttributesJson(task.rewardAttributes);
      const updatedAccount = await this.accountRepository.applyTaskRewards(
        userId,
        {
          rewardMoney: task.rewardMoney,
          rewardGameScore: task.rewardGameScore ?? 0,
          rewardStrength: rewardAttributes.strength ?? 0,
          rewardIntelligence: rewardAttributes.intelligence ?? 0,
          rewardCharisma: rewardAttributes.charisma ?? 0,
          rewardEndurance: rewardAttributes.endurance ?? 0,
        },
        tx,
      );

      return {
        submission: this.toTaskSubmissionResponse(submission),
        user: {
          balance: updatedAccount.balance,
          gameScore: updatedAccount.gameScore,
          strength: updatedAccount.strength,
          intelligence: updatedAccount.intelligence,
          charisma: updatedAccount.charisma,
          endurance: updatedAccount.endurance,
        },
      };
    });
  }

  async getUserTaskSubmissions(
    userId: string,
    actor: AccessTokenPayload,
  ): Promise<UserTaskSubmissionsResponseDto> {
    if (actor.actorType === 'user' && actor.sub !== userId) {
      throw new ForbiddenException('Users can only access their own submissions');
    }

    const account = await this.accountRepository.findById(userId);

    if (!account) {
      throw new NotFoundException('User is not found');
    }

    const submissions = await this.taskSubmissionRepository.findByUserId(userId);

    return {
      submissions: submissions.map((submission) => this.toTaskSubmissionResponse(submission)),
    };
  }

  private async ensureSubmissionAllowed(
    task: Task,
    userId: string,
    now: Date,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (task.type === TaskType.daily) {
      const dayRange = this.getUtcDayRange(now);
      const todaySubmissionsCount = await this.taskSubmissionRepository.countByTaskAndUserInRange(
        task.id,
        userId,
        dayRange.start,
        dayRange.end,
        tx,
      );

      const dailyLimit = task.submissionLimit ?? DEFAULT_DAILY_SUBMISSION_LIMIT;

      if (todaySubmissionsCount >= dailyLimit) {
        throw new ConflictException('Daily submission limit has been reached');
      }

      return;
    }

    if (task.type === TaskType.weekly) {
      const weekRange = this.getUtcIsoWeekRange(now);
      const weeklySubmissionsCount = await this.taskSubmissionRepository.countByTaskAndUserInRange(
        task.id,
        userId,
        weekRange.start,
        weekRange.end,
        tx,
      );

      if (weeklySubmissionsCount >= 1) {
        throw new ConflictException('Weekly task is already completed for this week');
      }

      return;
    }

    const eventAlreadyCompleted = await this.taskSubmissionRepository.existsByTask(task.id, tx);

    if (eventAlreadyCompleted) {
      throw new ConflictException('Event task is already completed');
    }
  }

  private getUtcDayRange(value: Date): { start: Date; end: Date } {
    const start = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0),
    );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { start, end };
  }

  private getUtcIsoWeekRange(value: Date): { start: Date; end: Date } {
    const start = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0),
    );
    const day = start.getUTCDay();
    const isoDay = day === 0 ? 7 : day;
    const daysFromWeekStart = isoDay - 1;

    start.setUTCDate(start.getUTCDate() - daysFromWeekStart);

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);

    return { start, end };
  }

  private resolveSubmissionLimit(
    taskType: TaskType,
    submissionLimit: number | undefined,
    currentValue: number | null,
  ): number | null {
    if (taskType !== TaskType.daily) {
      return null;
    }

    if (submissionLimit !== undefined) {
      return submissionLimit;
    }

    return currentValue;
  }

  private hasTaskUpdatePayload(payload: UpdateTaskDto): boolean {
    return (
      payload.type !== undefined ||
      payload.title !== undefined ||
      payload.description !== undefined ||
      payload.image !== undefined ||
      payload.rewardMoney !== undefined ||
      payload.rewardGameScore !== undefined ||
      payload.rewardAttributes !== undefined ||
      payload.requiresProofImage !== undefined ||
      payload.submissionLimit !== undefined
    );
  }

  private normalizeNullableString(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : null;
  }

  private toRewardAttributesJson(
    rewardAttributes?: TaskRewardAttributesDto,
  ): Prisma.InputJsonObject | Prisma.NullableJsonNullValueInput {
    if (!rewardAttributes) {
      return Prisma.DbNull;
    }

    const normalized: Record<string, Prisma.InputJsonValue> = {};

    if (rewardAttributes.strength !== undefined) {
      normalized.strength = rewardAttributes.strength;
    }

    if (rewardAttributes.intelligence !== undefined) {
      normalized.intelligence = rewardAttributes.intelligence;
    }

    if (rewardAttributes.charisma !== undefined) {
      normalized.charisma = rewardAttributes.charisma;
    }

    if (rewardAttributes.endurance !== undefined) {
      normalized.endurance = rewardAttributes.endurance;
    }

    return Object.keys(normalized).length > 0 ? (normalized as Prisma.InputJsonObject) : Prisma.DbNull;
  }

  private fromRewardAttributesJson(value: Prisma.JsonValue | null): TaskRewardAttributes {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const attributes = value as Record<string, unknown>;
    const rewardAttributes: TaskRewardAttributes = {};

    const strength = this.toNonNegativeIntegerOrUndefined(attributes.strength);
    if (strength !== undefined) {
      rewardAttributes.strength = strength;
    }

    const intelligence = this.toNonNegativeIntegerOrUndefined(attributes.intelligence);
    if (intelligence !== undefined) {
      rewardAttributes.intelligence = intelligence;
    }

    const charisma = this.toNonNegativeIntegerOrUndefined(attributes.charisma);
    if (charisma !== undefined) {
      rewardAttributes.charisma = charisma;
    }

    const endurance = this.toNonNegativeIntegerOrUndefined(attributes.endurance);
    if (endurance !== undefined) {
      rewardAttributes.endurance = endurance;
    }

    return rewardAttributes;
  }

  private toNonNegativeIntegerOrUndefined(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      return undefined;
    }

    return value;
  }

  private toTaskResponse(task: Task): TaskResponseDto {
    return {
      id: task.id,
      type: task.type,
      title: task.title,
      description: task.description,
      image: task.image,
      rewardMoney: task.rewardMoney,
      rewardGameScore: task.rewardGameScore,
      rewardAttributes: this.toRewardAttributesDto(task.rewardAttributes),
      requiresProofImage: task.requiresProofImage,
      submissionLimit: task.submissionLimit,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private toRewardAttributesDto(value: Prisma.JsonValue | null): TaskRewardAttributesDto | null {
    const rewardAttributes = this.fromRewardAttributesJson(value);

    return Object.keys(rewardAttributes).length > 0 ? rewardAttributes : null;
  }

  private toTaskSubmissionResponse(submission: TaskSubmission): TaskSubmissionResponseDto {
    return {
      id: submission.id,
      taskId: submission.taskId,
      userId: submission.userId,
      proofImage: submission.proofImage,
      createdAt: submission.createdAt.toISOString(),
    };
  }

  private toClientTaskResponse(
    task: Task,
    completedEventTaskIds: Set<string>,
    dailySubmissionCounts: Map<string, number>,
    weeklySubmissionCounts: Map<string, number>,
  ): ClientTaskResponseDto {
    return {
      id: task.id,
      type: task.type,
      title: task.title,
      image: task.image,
      rewardMoney: task.rewardMoney,
      rewardGameScore: task.rewardGameScore,
      rewardAttributes: this.toRewardAttributesDto(task.rewardAttributes),
      requiresProofImage: task.requiresProofImage,
      isAvailable: this.getClientTaskAvailability(
        task,
        completedEventTaskIds,
        dailySubmissionCounts,
        weeklySubmissionCounts,
      ),
    };
  }

  private getClientTaskAvailability(
    task: Task,
    completedEventTaskIds: Set<string>,
    dailySubmissionCounts: Map<string, number>,
    weeklySubmissionCounts: Map<string, number>,
  ): boolean {
    if (task.type === TaskType.event) {
      return !completedEventTaskIds.has(task.id);
    }

    if (task.type === TaskType.weekly) {
      return (weeklySubmissionCounts.get(task.id) ?? 0) < 1;
    }

    const dailyLimit = task.submissionLimit ?? DEFAULT_DAILY_SUBMISSION_LIMIT;
    return (dailySubmissionCounts.get(task.id) ?? 0) < dailyLimit;
  }
}
