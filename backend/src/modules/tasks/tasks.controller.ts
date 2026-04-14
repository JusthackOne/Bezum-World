import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { TaskType } from '@prisma/client';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import {
  AdminTasksListResponseDto,
  AdminDeleteTaskResponseDto,
  CreateTaskDto,
  ClientTasksListResponseDto,
  GetAdminTasksQueryDto,
  GetClientTasksQueryDto,
  SubmitTaskDto,
  SubmitTaskResponseDto,
  TaskIdParamsDto,
  TaskResponseDto,
  UserTaskSubmissionsParamsDto,
  UserTaskSubmissionsResponseDto,
  UpdateTaskDto,
} from './dto';
import { TasksService } from './tasks.service';

const TASK_IMAGES_UPLOAD_DIR = join(process.cwd(), 'uploads', 'tasks');
const MAX_TASK_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const TASK_IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

interface UploadedTaskImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('tasks')
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('admin/tasks')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: MAX_TASK_IMAGE_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    summary: 'Create task (admin only)',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: Object.values(TaskType) },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        rewardMoney: { type: 'integer', minimum: 0 },
        rewardGameScore: { type: 'integer', minimum: 0, nullable: true },
        rewardAttributes: {
          type: 'object',
          nullable: true,
          properties: {
            strength: { type: 'integer', minimum: 0, maximum: 100 },
            intelligence: { type: 'integer', minimum: 0, maximum: 100 },
            charisma: { type: 'integer', minimum: 0, maximum: 100 },
            endurance: { type: 'integer', minimum: 0, maximum: 100 },
          },
        },
        requiresProofImage: { type: 'boolean' },
        submissionLimit: { type: 'integer', minimum: 1, nullable: true },
        image: { type: 'string', format: 'binary' },
      },
      required: ['type', 'title', 'rewardMoney', 'requiresProofImage'],
    },
  })
  @ApiCreatedResponse({ type: TaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async createTask(
    @Body() body: CreateTaskDto,
    @UploadedFile() imageFile?: UploadedTaskImageFile,
  ): Promise<TaskResponseDto> {
    const uploadedImageUrl = imageFile ? await this.storeTaskImage(imageFile) : undefined;

    return this.tasksService.createTaskByAdminWithUploadedImage(body, uploadedImageUrl);
  }

  @Patch('admin/tasks/:taskId')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: MAX_TASK_IMAGE_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    summary: 'Update task (admin only)',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiParam({
    name: 'taskId',
    description: 'Task identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Task is not found' })
  @ApiBadRequestResponse({ description: 'At least one field must be provided' })
  async updateTask(
    @Param() params: TaskIdParamsDto,
    @Body() body: UpdateTaskDto,
    @UploadedFile() imageFile?: UploadedTaskImageFile,
  ): Promise<TaskResponseDto> {
    const uploadedImageUrl = imageFile ? await this.storeTaskImage(imageFile) : undefined;

    return this.tasksService.updateTaskByAdmin(params.taskId, body, uploadedImageUrl);
  }

  @Delete('admin/tasks/:taskId')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: 'Delete task by id (admin only)',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'taskId',
    description: 'Task identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiOkResponse({ type: AdminDeleteTaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Task is not found' })
  async deleteTaskByAdmin(@Param() params: TaskIdParamsDto): Promise<AdminDeleteTaskResponseDto> {
    return this.tasksService.deleteTaskByAdmin(params.taskId);
  }

  @Get('admin/tasks')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: 'Get tasks with filters, search, and pagination (admin only)',
  })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: TaskType })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ type: AdminTasksListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  async getAdminTasks(@Query() query: GetAdminTasksQueryDto): Promise<AdminTasksListResponseDto> {
    return this.tasksService.getAdminTasks(query);
  }

  @Get('admin/tasks/:taskId')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: 'Get task by id (admin only)',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'taskId',
    description: 'Task identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiNotFoundResponse({ description: 'Task is not found' })
  async getAdminTaskById(@Param() params: TaskIdParamsDto): Promise<TaskResponseDto> {
    return this.tasksService.getTaskByIdByAdmin(params.taskId);
  }

  @Get('tasks')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get tasks for current user',
  })
  @ApiBearerAuth('access-token')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: TaskType })
  @ApiOkResponse({ type: ClientTasksListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can view tasks' })
  async getClientTasks(
    @Query() query: GetClientTasksQueryDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<ClientTasksListResponseDto> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can view tasks');
    }

    return this.tasksService.getClientTasksByUser(request.user.sub, query);
  }

  @Post('tasks/:taskId/submit')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Submit task by id',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'taskId',
    description: 'Task identifier',
    example: '2df8c39f-3255-4b40-9cb2-7f236c0b62e3',
  })
  @ApiCreatedResponse({ type: SubmitTaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Only user accounts can submit tasks' })
  @ApiNotFoundResponse({ description: 'Task is not found' })
  @ApiConflictResponse({ description: 'Task submission is not allowed by current limits' })
  @ApiBadRequestResponse({ description: 'Proof image is required for this task' })
  async submitTask(
    @Param() params: TaskIdParamsDto,
    @Body() body: SubmitTaskDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<SubmitTaskResponseDto> {
    if (!request.user?.sub || request.user.actorType !== 'user') {
      throw new ForbiddenException('Only user accounts can submit tasks');
    }

    return this.tasksService.submitTask(params.taskId, request.user.sub, body);
  }

  @Get('users/:userId/task-submissions')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get user task submissions',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'userId',
    description: 'User identifier',
    example: '2ad55bcf-4ee2-4a44-86cd-e62052d51a3f',
  })
  @ApiOkResponse({ type: UserTaskSubmissionsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Users can only access their own submissions' })
  @ApiNotFoundResponse({ description: 'User is not found' })
  async getUserTaskSubmissions(
    @Param() params: UserTaskSubmissionsParamsDto,
    @Req() request: RequestWithAuthUser,
  ): Promise<UserTaskSubmissionsResponseDto> {
    if (!request.user?.sub) {
      throw new ForbiddenException('Only authenticated users can access submissions');
    }

    return this.tasksService.getUserTaskSubmissions(params.userId, request.user);
  }

  private async storeTaskImage(file: UploadedTaskImageFile): Promise<string> {
    const imageExtension =
      TASK_IMAGE_MIME_TO_EXTENSION[file.mimetype] ?? extname(file.originalname).toLowerCase();

    if (!imageExtension || !Object.values(TASK_IMAGE_MIME_TO_EXTENSION).includes(imageExtension)) {
      throw new BadRequestException('Task image must be jpeg, png, webp, or gif');
    }

    if (file.size > MAX_TASK_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Task image file is too large');
    }

    await mkdir(TASK_IMAGES_UPLOAD_DIR, { recursive: true });
    const fileName = `${randomUUID()}${imageExtension}`;
    await writeFile(join(TASK_IMAGES_UPLOAD_DIR, fileName), file.buffer);

    return `/uploads/tasks/${fileName}`;
  }
}
