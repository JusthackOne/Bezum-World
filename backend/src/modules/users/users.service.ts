import { Injectable, NotFoundException } from '@nestjs/common';

import { PublicUserProfileDto } from './dto/public-user-profile.dto';
import { UserProfileRepository } from './repositories/user-profile.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async getPublicProfileByUsername(username: string): Promise<PublicUserProfileDto> {
    const normalizedUsername = username.trim();
    const account = await this.userProfileRepository.findByUsername(normalizedUsername);

    if (!account) {
      throw new NotFoundException('User is not found');
    }

    return {
      username: account.username,
      lastLoginAt: account.lastTimeLoggedIn?.toISOString() ?? null,
      profilePhoto: account.avatarUrl,
      attributes: {
        strength: account.strength,
        charisma: account.charisma,
        endurance: account.endurance,
        intelligence: account.intelligence,
      },
    };
  }
}
