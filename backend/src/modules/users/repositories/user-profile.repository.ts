import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface PublicUserProfileRecord {
  username: string;
  avatarUrl: string | null;
  lastTimeLoggedIn: Date | null;
  balance: number;
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
}

@Injectable()
export class UserProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<PublicUserProfileRecord | null> {
    return this.prisma.account.findFirst({
      where: { username },
      select: {
        username: true,
        avatarUrl: true,
        lastTimeLoggedIn: true,
        balance: true,
        strength: true,
        charisma: true,
        endurance: true,
        intelligence: true,
      },
    });
  }
}
