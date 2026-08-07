import { describe, expect, mock, test } from 'bun:test';
import { NotificationEventType, TaskType, type Prisma } from '@prisma/client';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { AccountRepository } from '../src/modules/auth/repositories';
import { EventsService } from '../src/modules/events/events.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import {
  TaskRepository,
  TaskSubmissionRepository,
  TaskSuggestionRepository,
} from '../src/modules/tasks/repositories';
import { TasksService } from '../src/modules/tasks/tasks.service';

describe('TasksService task completion notifications', () => {
  test('enqueues a proof-image Telegram notification in the completion transaction', async () => {
    const transactionClient = {} as Prisma.TransactionClient;
    const submissionCreatedAt = new Date('2026-08-07T10:30:00.000Z');
    const enqueue = mock(async () => undefined);
    const createTaskCompletedEvent = mock(async () => undefined);
    const prisma = {
      $transaction: async <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) =>
        callback(transactionClient),
    } as unknown as PrismaService;
    const taskRepository = {
      findByIdForUpdate: mock(async () => ({
        id: 'task-1',
        type: TaskType.event,
        title: 'Find the relic',
        description: null,
        image: null,
        rewardMoney: 1_000,
        rewardGameScore: 50,
        rewardAttributes: { strength: 2, endurance: 1 },
        requiresProofImage: true,
        submissionLimit: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as unknown as TaskRepository;
    const taskSubmissionRepository = {
      existsByTask: mock(async () => false),
      create: mock(async () => ({
        id: 'submission-1',
        taskId: 'task-1',
        userId: 'user-1',
        proofImage: '/uploads/task-proofs/proof.jpg',
        grantedGameScore: 50,
        createdAt: submissionCreatedAt,
      })),
    } as unknown as TaskSubmissionRepository;
    const accountRepository = {
      findByIdInTransaction: mock(async () => ({ id: 'user-1', username: 'hero' })),
      applyTaskRewards: mock(async () => ({
        balance: 1_000,
        gameScore: 50,
        strength: 2,
        intelligence: 0,
        charisma: 0,
        endurance: 1,
      })),
    } as unknown as AccountRepository;
    const service = new TasksService(
      prisma,
      taskRepository,
      {} as TaskSuggestionRepository,
      taskSubmissionRepository,
      accountRepository,
      { createTaskCompletedEvent } as unknown as EventsService,
      { enqueue } as unknown as NotificationsService,
    );

    await service.submitTask('task-1', 'user-1', {
      proofImage: '/uploads/task-proofs/proof.jpg',
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[0]).toEqual({
      type: NotificationEventType.TASK_COMPLETED,
      payload: {
        taskId: 'task-1',
        submissionId: 'submission-1',
        title: 'Find the relic',
        taskType: TaskType.event,
        completedByUsername: 'hero',
        proofImage: '/uploads/task-proofs/proof.jpg',
        completedAt: submissionCreatedAt.toISOString(),
        rewards: {
          money: 1_000,
          gameScore: 50,
          strength: 2,
          intelligence: 0,
          charisma: 0,
          endurance: 1,
        },
      },
    });
    expect(enqueue.mock.calls[0]?.[1]).toBe('task-completed:submission-1');
    expect(enqueue.mock.calls[0]?.[2]).toBe(transactionClient);
    expect(createTaskCompletedEvent).toHaveBeenCalledTimes(1);
  });
});
