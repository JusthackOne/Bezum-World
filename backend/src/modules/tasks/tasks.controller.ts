import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { TaskType } from '@prisma/client';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { AdminOnlyGuard } from '../auth/guards/admin-only.guard';
import type { RequestWithAuthUser } from '../auth/types/request-with-auth-user.type';
import {
  AdminTasksListResponseDto,
  CreateTaskDto,
  GetAdminTasksQueryDto,
  SubmitTaskDto,
  SubmitTaskResponseDto,
  TaskIdParamsDto,
  TaskResponseDto,
  UserTaskSubmissionsParamsDto,
  UserTaskSubmissionsResponseDto,
  UpdateTaskDto,
} from './dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('admin/tasks')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: 'Create task (admin only)',
  })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ type: TaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is invalid' })
  @ApiForbiddenResponse({ description: 'Admin access is required' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async createTask(@Body() body: CreateTaskDto): Promise<TaskResponseDto> {
    return this.tasksService.createTaskByAdmin(body);
  }

  @Patch('admin/tasks/:taskId')
  @UseGuards(AccessTokenGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: 'Update task (admin only)',
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
  @ApiBadRequestResponse({ description: 'At least one field must be provided' })
  async updateTask(
    @Param() params: TaskIdParamsDto,
    @Body() body: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.updateTaskByAdmin(params.taskId, body);
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
}
