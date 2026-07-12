import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, TaskType, type Task, type TaskSubmission } from '@prisma/client';
import { randomInt } from 'node:crypto';

import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { AccountRepository } from '../auth/repositories';
import { EventsService } from '../events/events.service';
import type {
  AdminDeleteTaskResponseDto,
  AdminTasksListResponseDto,
  ClientTaskResponseDto,
  ClientTasksListResponseDto,
  CreateTaskDto,
  DeleteTaskSuggestionResponseDto,
  GetAdminTasksQueryDto,
  GetClientTasksQueryDto,
  SubmitTaskDto,
  SubmitTaskResponseDto,
  TaskSuggestionResponseDto,
  TaskSuggestionsResponseDto,
  TaskSuggestionVoteResponseDto,
  TaskResponseDto,
  TaskRewardAttributesDto,
  TaskSubmissionResponseDto,
  UpdateTaskDto,
  UserTaskSubmissionsResponseDto,
} from './dto';
import {
  TaskRepository,
  TaskSuggestionRepository,
  type TaskSuggestionWithCreatorAndVotes,
  TaskSubmissionRepository,
  type CompletedEventTaskSubmission,
  type UpdateTaskInput,
} from './repositories';
import type { TaskRewardAttributes } from './types/task-reward-attributes.type';
import { PrismaService } from '../../database/prisma/prisma.service';

const DEFAULT_ADMIN_TASKS_PAGE = 1;
const DEFAULT_ADMIN_TASKS_LIMIT = 20;
const DEFAULT_DAILY_SUBMISSION_LIMIT = 1;
const EVENT_COMPLETION_FEED_VISIBILITY_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class TasksService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly taskRepository: TaskRepository,
    private readonly taskSuggestionRepository: TaskSuggestionRepository,
    private readonly taskSubmissionRepository: TaskSubmissionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly eventsService: EventsService,
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

  async createTaskSuggestion(
    userId: string,
    payload: CreateTaskDto,
    uploadedImageUrl?: string,
  ): Promise<TaskSuggestionResponseDto> {
    const account = await this.accountRepository.findById(userId);

    if (!account) {
      throw new NotFoundException('User is not found');
    }

    const suggestedForDate = this.getConfiguredDateKey(new Date());

    try {
      const suggestion = await this.taskSuggestionRepository.create({
        creatorUserId: userId,
        suggestedForDate,
        type: payload.type,
        title: payload.title,
        description: this.normalizeNullableString(payload.description),
        image: this.normalizeNullableString(uploadedImageUrl ?? payload.image),
        rewardMoney: payload.rewardMoney,
        rewardGameScore: payload.rewardGameScore ?? null,
        rewardAttributes: this.toRewardAttributesJson(payload.rewardAttributes),
        requiresProofImage: payload.requiresProofImage,
        submissionLimit: this.resolveSubmissionLimit(payload.type, payload.submissionLimit, null),
      });

      return this.toTaskSuggestionResponse(suggestion, userId);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('You have already suggested a task today');
      }

      throw error;
    }
  }

  async getCurrentDayTaskSuggestions(userId: string): Promise<TaskSuggestionsResponseDto> {
    const account = await this.accountRepository.findById(userId);

    if (!account) {
      throw new NotFoundException('User is not found');
    }

    const suggestions = await this.taskSuggestionRepository.findCurrentDaySuggestions(
      this.getConfiguredDateKey(new Date()),
    );
    const hasVotedToday = suggestions.some((suggestion) =>
      suggestion.votes.some((vote) => vote.voterUserId === userId),
    );

    return {
      items: suggestions.map((suggestion) =>
        this.toTaskSuggestionResponse(suggestion, userId, hasVotedToday),
      ),
      hasSuggestedToday: suggestions.some((suggestion) => suggestion.creatorUserId === userId),
    };
  }

  async updateOwnTaskSuggestion(
    suggestionId: string,
    userId: string,
    payload: CreateTaskDto,
    uploadedImageUrl?: string,
  ): Promise<TaskSuggestionResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const suggestion = await this.getEditableOwnedSuggestion(suggestionId, userId, tx);
      const updatedSuggestion = await this.taskSuggestionRepository.update(
        suggestion.id,
        {
          type: payload.type,
          title: payload.title,
          description: this.normalizeNullableString(payload.description),
          image: this.normalizeNullableString(uploadedImageUrl ?? payload.image),
          rewardMoney: payload.rewardMoney,
          rewardGameScore: payload.rewardGameScore ?? null,
          rewardAttributes: this.toRewardAttributesJson(payload.rewardAttributes),
          requiresProofImage: payload.requiresProofImage,
          submissionLimit: this.resolveSubmissionLimit(payload.type, payload.submissionLimit, null),
        },
        tx,
      );

      return this.toTaskSuggestionResponse(updatedSuggestion, userId);
    });
  }

  async deleteOwnTaskSuggestion(
    suggestionId: string,
    userId: string,
  ): Promise<DeleteTaskSuggestionResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const suggestion = await this.getEditableOwnedSuggestion(suggestionId, userId, tx);
      await this.taskSuggestionRepository.delete(suggestion.id, tx);
      return { deletedSuggestionId: suggestion.id };
    });
  }

  async voteForTaskSuggestion(
    suggestionId: string,
    userId: string,
  ): Promise<TaskSuggestionVoteResponseDto> {
    const account = await this.accountRepository.findById(userId);

    if (!account) {
      throw new NotFoundException('User is not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const suggestion = await this.taskSuggestionRepository.findByIdWithCreatorAndVotes(
        suggestionId,
        tx,
      );

      if (!suggestion) {
        throw new NotFoundException('Task suggestion is not found');
      }

      if (suggestion.status !== 'pending') {
        throw new ConflictException('Task suggestion voting is closed');
      }

      const todayDateKey = this.getConfiguredDateKey(new Date());
      if (suggestion.suggestedForDate.getTime() !== todayDateKey.getTime()) {
        throw new ConflictException('Task suggestion voting is closed');
      }

      if (suggestion.creatorUserId === userId) {
        throw new ForbiddenException('Users cannot vote for their own suggestions');
      }

      try {
        await this.taskSuggestionRepository.createVote(
          suggestion.id,
          userId,
          suggestion.suggestedForDate,
          tx,
        );
      } catch (error: unknown) {
        if (this.isUniqueConstraintError(error)) {
          throw new ConflictException('You have already voted for a task suggestion today');
        }

        throw error;
      }

      const updatedSuggestion = await this.taskSuggestionRepository.findByIdWithCreatorAndVotes(
        suggestion.id,
        tx,
      );

      if (!updatedSuggestion) {
        throw new NotFoundException('Task suggestion is not found');
      }

      return {
        suggestionId: updatedSuggestion.id,
        voteCount: updatedSuggestion._count.votes,
        hasVoted: true,
      };
    });
  }

  async processPendingSuggestionDays(): Promise<void> {
    const todayDateKey = this.getConfiguredDateKey(new Date());
    const pendingDates =
      await this.taskSuggestionRepository.findPendingSuggestionDatesBefore(todayDateKey);

    for (const suggestedForDate of pendingDates) {
      await this.processSuggestionDate(suggestedForDate);
    }
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
      ...(payload.image !== undefined
        ? { image: this.normalizeNullableString(payload.image) }
        : {}),
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

    const completedEventVisibleAfter = new Date(
      now.getTime() - EVENT_COMPLETION_FEED_VISIBILITY_MS,
    );

    const [tasks, completedEventSubmissions, dailySubmissionCounts, weeklySubmissionCounts] =
      await Promise.all([
        this.taskRepository.findManyForClient({
          ...(query.search !== undefined ? { search: query.search } : {}),
          ...(query.type !== undefined ? { type: query.type } : {}),
        }),
        this.taskSubmissionRepository.findCompletedEventSubmissions(),
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
    const completedEventSubmissionsByTaskId = this.toCompletedEventSubmissionsByTaskId(
      completedEventSubmissions,
    );
    const visibleTasks = tasks.filter((task) =>
      this.shouldShowClientTask(
        task,
        completedEventSubmissionsByTaskId,
        completedEventVisibleAfter,
      ),
    );

    return {
      items: visibleTasks.map((task) =>
        this.toClientTaskResponse(
          task,
          completedEventSubmissionsByTaskId,
          dailySubmissionCounts,
          weeklySubmissionCounts,
        ),
      ),
    };
  }

  async submitTask(
    taskId: string,
    userId: string,
    payload: SubmitTaskDto,
  ): Promise<SubmitTaskResponseDto> {
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

      await this.eventsService.createTaskCompletedEvent(
        {
          userId,
          taskId: task.id,
          taskSubmissionId: submission.id,
          proofImage: submission.proofImage,
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

  private getConfiguredDateKey(value: Date): Date {
    const parts = this.getDatePartsInConfiguredTimeZone(value);

    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0));
  }

  private getDatePartsInConfiguredTimeZone(value: Date): { year: number; month: number; day: number } {
    const timeZone = this.configService.get<string>('app.timeZone') ?? 'UTC';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const formattedParts = formatter.formatToParts(value);
    const year = Number(formattedParts.find((part) => part.type === 'year')?.value);
    const month = Number(formattedParts.find((part) => part.type === 'month')?.value);
    const day = Number(formattedParts.find((part) => part.type === 'day')?.value);

    if (!year || !month || !day) {
      return {
        year: value.getUTCFullYear(),
        month: value.getUTCMonth() + 1,
        day: value.getUTCDate(),
      };
    }

    return { year, month, day };
  }

  private async processSuggestionDate(suggestedForDate: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "task_suggestions"
        WHERE "suggested_for_date" = ${suggestedForDate}
          AND "status" = 'pending'::"TaskSuggestionStatus"
        ORDER BY "created_at" ASC
        FOR UPDATE
      `;

      const topVotedSuggestions =
        await this.taskSuggestionRepository.findTopVotedSuggestionsForDate(suggestedForDate, tx);
      const winner =
        topVotedSuggestions.length === 0
          ? null
          : topVotedSuggestions[randomInt(topVotedSuggestions.length)];

      if (!winner) {
        await this.taskSuggestionRepository.markDateProcessed(
          suggestedForDate,
          null,
          null,
          new Date(),
          tx,
        );
        return;
      }

      const publishedTask = await this.taskRepository.create(
        {
          type: winner.type,
          title: winner.title,
          description: winner.description,
          image: winner.image,
          rewardMoney: winner.rewardMoney,
          rewardGameScore: winner.rewardGameScore,
          rewardAttributes:
            winner.rewardAttributes === null ? Prisma.DbNull : winner.rewardAttributes,
          requiresProofImage: winner.requiresProofImage,
          submissionLimit: winner.submissionLimit,
        },
        tx,
      );

      await this.taskSuggestionRepository.markDateProcessed(
        suggestedForDate,
        winner.id,
        publishedTask.id,
        new Date(),
        tx,
      );
    });
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

    return Object.keys(normalized).length > 0
      ? (normalized as Prisma.InputJsonObject)
      : Prisma.DbNull;
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
    completedEventSubmissionsByTaskId: Map<string, CompletedEventTaskSubmission>,
    dailySubmissionCounts: Map<string, number>,
    weeklySubmissionCounts: Map<string, number>,
  ): ClientTaskResponseDto {
    const completedEventSubmission =
      task.type === TaskType.event ? completedEventSubmissionsByTaskId.get(task.id) : undefined;

    return {
      id: task.id,
      type: task.type,
      title: task.title,
      description: task.description,
      image: completedEventSubmission?.proofImage ?? task.image,
      rewardMoney: task.rewardMoney,
      rewardGameScore: task.rewardGameScore,
      rewardAttributes: this.toRewardAttributesDto(task.rewardAttributes),
      requiresProofImage: task.requiresProofImage,
      isAvailable: this.getClientTaskAvailability(
        task,
        completedEventSubmissionsByTaskId,
        dailySubmissionCounts,
        weeklySubmissionCounts,
      ),
      createdAt: task.createdAt.toISOString(),
    };
  }

  private toTaskSuggestionResponse(
    suggestion: TaskSuggestionWithCreatorAndVotes,
    currentUserId: string,
    hasVotedToday?: boolean,
  ): TaskSuggestionResponseDto {
    const hasVoted = suggestion.votes.some((vote) => vote.voterUserId === currentUserId);
    const isOwnSuggestion = suggestion.creatorUserId === currentUserId;
    const cannotVoteBecauseVotedToday = hasVotedToday ?? hasVoted;

    return {
      id: suggestion.id,
      type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      image: suggestion.image,
      rewardMoney: suggestion.rewardMoney,
      rewardGameScore: suggestion.rewardGameScore,
      rewardAttributes: this.toRewardAttributesDto(suggestion.rewardAttributes),
      requiresProofImage: suggestion.requiresProofImage,
      submissionLimit: suggestion.submissionLimit,
      creator: {
        id: suggestion.creator.id,
        username: suggestion.creator.username,
        avatarUrl: suggestion.creator.avatarUrl,
      },
      voteCount: suggestion._count.votes,
      hasVoted,
      canVote: !isOwnSuggestion && !cannotVoteBecauseVotedToday,
      isOwner: isOwnSuggestion,
      createdAt: suggestion.createdAt.toISOString(),
    };
  }

  private async getEditableOwnedSuggestion(
    suggestionId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<TaskSuggestionWithCreatorAndVotes> {
    const suggestion = await this.taskSuggestionRepository.findByIdWithCreatorAndVotes(
      suggestionId,
      tx,
    );
    if (!suggestion) throw new NotFoundException('Task suggestion is not found');
    if (suggestion.creatorUserId !== userId) {
      throw new ForbiddenException('Only the suggestion owner can change it');
    }
    const today = this.getConfiguredDateKey(new Date());
    if (suggestion.status !== 'pending' || suggestion.publishedTaskId !== null ||
        suggestion.suggestedForDate.getTime() !== today.getTime()) {
      throw new ConflictException('Task suggestion can no longer be changed');
    }
    return suggestion;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private getClientTaskAvailability(
    task: Task,
    completedEventSubmissionsByTaskId: Map<string, CompletedEventTaskSubmission>,
    dailySubmissionCounts: Map<string, number>,
    weeklySubmissionCounts: Map<string, number>,
  ): boolean {
    if (task.type === TaskType.event) {
      return !completedEventSubmissionsByTaskId.has(task.id);
    }

    if (task.type === TaskType.weekly) {
      return (weeklySubmissionCounts.get(task.id) ?? 0) < 1;
    }

    const dailyLimit = task.submissionLimit ?? DEFAULT_DAILY_SUBMISSION_LIMIT;
    return (dailySubmissionCounts.get(task.id) ?? 0) < dailyLimit;
  }

  private toCompletedEventSubmissionsByTaskId(
    submissions: CompletedEventTaskSubmission[],
  ): Map<string, CompletedEventTaskSubmission> {
    return new Map(submissions.map((submission) => [submission.taskId, submission]));
  }

  private shouldShowClientTask(
    task: Task,
    completedEventSubmissionsByTaskId: Map<string, CompletedEventTaskSubmission>,
    completedEventVisibleAfter: Date,
  ): boolean {
    if (task.type !== TaskType.event) {
      return true;
    }

    const completedEventSubmission = completedEventSubmissionsByTaskId.get(task.id);

    if (!completedEventSubmission) {
      return true;
    }

    return (
      completedEventSubmission.proofImage !== null &&
      completedEventSubmission.createdAt >= completedEventVisibleAfter
    );
  }
}
