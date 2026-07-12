import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TaskSuggestionStatus,
  type Account,
  type TaskSuggestion,
  type TaskSuggestionVote,
  type TaskType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export type TaskSuggestionWithCreatorAndVotes = TaskSuggestion & {
  creator: Pick<Account, 'id' | 'username' | 'avatarUrl'>;
  votes: Array<Pick<TaskSuggestionVote, 'voterUserId'>>;
  _count: {
    votes: number;
  };
};

export interface CreateTaskSuggestionInput {
  creatorUserId: string;
  suggestedForDate: Date;
  type: TaskType;
  title: string;
  description: string | null;
  image: string | null;
  rewardMoney: number;
  rewardGameScore: number | null;
  rewardAttributes: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  requiresProofImage: boolean;
  submissionLimit: number | null;
}

export type UpdateTaskSuggestionInput = Omit<
  CreateTaskSuggestionInput,
  'creatorUserId' | 'suggestedForDate'
>;

@Injectable()
export class TaskSuggestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateTaskSuggestionInput,
    tx?: Prisma.TransactionClient,
  ): Promise<TaskSuggestionWithCreatorAndVotes> {
    return this.getClient(tx).taskSuggestion.create({
      data: {
        creatorUserId: input.creatorUserId,
        suggestedForDate: input.suggestedForDate,
        type: input.type,
        title: input.title,
        description: input.description,
        image: input.image,
        rewardMoney: input.rewardMoney,
        rewardGameScore: input.rewardGameScore,
        rewardAttributes: input.rewardAttributes,
        requiresProofImage: input.requiresProofImage,
        submissionLimit: input.submissionLimit,
      },
      include: this.suggestionInclude(),
    });
  }

  async findCurrentDaySuggestions(
    suggestedForDate: Date,
  ): Promise<TaskSuggestionWithCreatorAndVotes[]> {
    return this.prisma.taskSuggestion.findMany({
      where: {
        suggestedForDate,
        status: TaskSuggestionStatus.pending,
      },
      include: this.suggestionInclude(),
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findByIdWithCreatorAndVotes(
    suggestionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TaskSuggestionWithCreatorAndVotes | null> {
    return this.getClient(tx).taskSuggestion.findUnique({
      where: {
        id: suggestionId,
      },
      include: this.suggestionInclude(),
    });
  }

  async createVote(
    suggestionId: string,
    voterUserId: string,
    suggestedForDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<TaskSuggestionVote> {
    return this.getClient(tx).taskSuggestionVote.create({
      data: {
        suggestionId,
        voterUserId,
        suggestedForDate,
      },
    });
  }

  async update(
    suggestionId: string,
    input: UpdateTaskSuggestionInput,
    tx: Prisma.TransactionClient,
  ): Promise<TaskSuggestionWithCreatorAndVotes> {
    return tx.taskSuggestion.update({
      where: { id: suggestionId },
      data: input,
      include: this.suggestionInclude(),
    });
  }

  async delete(suggestionId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.taskSuggestion.delete({ where: { id: suggestionId } });
  }

  async findPendingSuggestionDatesBefore(
    suggestedForDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<Date[]> {
    const groupedDates = await this.getClient(tx).taskSuggestion.groupBy({
      by: ['suggestedForDate'],
      where: {
        status: TaskSuggestionStatus.pending,
        suggestedForDate: {
          lt: suggestedForDate,
        },
      },
      orderBy: {
        suggestedForDate: 'asc',
      },
    });

    return groupedDates.map((dateGroup) => dateGroup.suggestedForDate);
  }

  async findTopVotedSuggestionsForDate(
    suggestedForDate: Date,
    tx: Prisma.TransactionClient,
  ): Promise<TaskSuggestionWithCreatorAndVotes[]> {
    const suggestions = await tx.taskSuggestion.findMany({
      where: {
        suggestedForDate,
        status: TaskSuggestionStatus.pending,
      },
      include: this.suggestionInclude(),
      orderBy: {
        votes: {
          _count: 'desc',
        },
      },
    });

    const highestVoteCount = suggestions[0]?._count.votes;
    if (highestVoteCount === undefined) {
      return [];
    }

    return suggestions.filter((suggestion) => suggestion._count.votes === highestVoteCount);
  }

  async markDateProcessed(
    suggestedForDate: Date,
    winnerSuggestionId: string | null,
    publishedTaskId: string | null,
    processedAt: Date,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.taskSuggestion.updateMany({
      where: {
        suggestedForDate,
        status: TaskSuggestionStatus.pending,
      },
      data: {
        status: TaskSuggestionStatus.processed,
        processedAt,
      },
    });

    if (!winnerSuggestionId) {
      return;
    }

    await tx.taskSuggestion.update({
      where: {
        id: winnerSuggestionId,
      },
      data: {
        status: TaskSuggestionStatus.winner,
        publishedTaskId,
        processedAt,
      },
    });
  }

  private suggestionInclude() {
    return {
      creator: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      votes: {
        select: {
          voterUserId: true,
        },
      },
      _count: {
        select: {
          votes: true,
        },
      },
    } satisfies Prisma.TaskSuggestionInclude;
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
