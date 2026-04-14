import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import {
  EquipmentSlotType,
  ItemRarity,
  Prisma,
  PrismaClient,
  type EquipmentSlotType as EquipmentSlotTypeValue,
  type ItemRarity as ItemRarityValue,
  type TaskType as TaskTypeValue,
} from '@prisma/client';

interface SeedUserEquipment {
  helmet?: string;
  chest?: string;
  pants?: string;
  boots?: string;
  leftWeapon?: string;
  rightWeapon?: string;
}

interface SeedUser {
  id: string;
  username: string;
  avatar: string | null;
  balance: number;
  gameScore: number;
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
  lastTimeLoggedIn: string | null;
  equipment?: SeedUserEquipment;
}

interface SeedItem {
  id: string;
  code: string;
  ownerUsername: string | null;
  name: string;
  description: string | null;
  image: string | null;
  slotType: EquipmentSlotTypeValue;
  rarity: ItemRarityValue;
  price: number;
  strength: number | null;
  charisma: number | null;
  agility: number | null;
  intelligence: number | null;
  durability: number | null;
}

interface SeedTaskRewardAttributes {
  strength?: number;
  intelligence?: number;
  charisma?: number;
  endurance?: number;
}

interface SeedTask {
  id: string;
  type: TaskTypeValue;
  title: string;
  description: string | null;
  image: string | null;
  rewardMoney: number;
  rewardGameScore: number | null;
  rewardAttributes: SeedTaskRewardAttributes | null;
  requiresProofImage: boolean;
  submissionLimit: number | null;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run seed');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ROOT_DIR = process.cwd();
const SEED_DATA_DIR = join(ROOT_DIR, 'seed', 'data');
const SEED_ASSETS_DIR = join(ROOT_DIR, 'seed', 'assets');
const UPLOADS_DIR = join(ROOT_DIR, 'uploads');

const SLOT_MAP: Record<keyof SeedUserEquipment, EquipmentSlotTypeValue> = {
  helmet: EquipmentSlotType.HELMET,
  chest: EquipmentSlotType.ARMOR,
  pants: EquipmentSlotType.PANTS,
  boots: EquipmentSlotType.BOOTS,
  leftWeapon: EquipmentSlotType.LEFT_HAND,
  rightWeapon: EquipmentSlotType.RIGHT_HAND,
};

async function main(): Promise<void> {
  const users = await readSeedArray<SeedUser>('users.json');
  const items = await readSeedArray<SeedItem>('items.json');
  const tasks = await readSeedArray<SeedTask>('tasks.json');

  validateSeedConsistency(users, items);

  const usernames = users.map((user) => user.username);
  const existingAccounts = await prisma.account.findMany({
    where: {
      username: {
        in: usernames,
      },
    },
    select: {
      id: true,
    },
  });

  const userIdsToDelete = new Set<string>([
    ...users.map((user) => user.id),
    ...existingAccounts.map((account) => account.id),
  ]);

  const userIdsToDeleteArray = [...userIdsToDelete];

  await prisma.$transaction(async (tx) => {
    if (userIdsToDeleteArray.length > 0) {
      await tx.userEquipmentSlot.deleteMany({
        where: {
          OR: [
            { userId: { in: userIdsToDeleteArray } },
            { itemId: { in: items.map((item) => item.id) } },
          ],
        },
      });

      await tx.taskSubmission.deleteMany({
        where: {
          OR: [
            { userId: { in: userIdsToDeleteArray } },
            { taskId: { in: tasks.map((task) => task.id) } },
          ],
        },
      });

      await tx.battleLog.deleteMany({
        where: {
          OR: [
            { attackerUserId: { in: userIdsToDeleteArray } },
            { defenderUserId: { in: userIdsToDeleteArray } },
            { winnerUserId: { in: userIdsToDeleteArray } },
            { loserUserId: { in: userIdsToDeleteArray } },
          ],
        },
      });

      await tx.authCode.deleteMany({
        where: {
          accountId: {
            in: userIdsToDeleteArray,
          },
        },
      });

      await tx.account.deleteMany({
        where: {
          id: {
            in: userIdsToDeleteArray,
          },
        },
      });
    }

    await tx.userEquipmentSlot.deleteMany({
      where: {
        itemId: {
          in: items.map((item) => item.id),
        },
      },
    });

    await tx.item.deleteMany({
      where: {
        id: {
          in: items.map((item) => item.id),
        },
      },
    });

    await tx.taskSubmission.deleteMany({
      where: {
        taskId: {
          in: tasks.map((task) => task.id),
        },
      },
    });

    await tx.task.deleteMany({
      where: {
        id: {
          in: tasks.map((task) => task.id),
        },
      },
    });

    const userIdByUsername = new Map<string, string>();
    for (const user of users) {
      const avatarUrl = user.avatar ? await copySeedAssetToUploads(user.avatar, 'avatars') : null;

      await tx.account.create({
        data: {
          id: user.id,
          username: user.username,
          avatarUrl,
          balance: user.balance,
          gameScore: user.gameScore,
          strength: user.strength,
          charisma: user.charisma,
          endurance: user.endurance,
          intelligence: user.intelligence,
          lastTimeLoggedIn: user.lastTimeLoggedIn ? new Date(user.lastTimeLoggedIn) : null,
        },
      });

      userIdByUsername.set(user.username, user.id);
    }

    const itemIdByCode = new Map<string, string>();

    for (const item of items) {
      const ownerUserId = item.ownerUsername
        ? (userIdByUsername.get(item.ownerUsername) ?? null)
        : null;
      const imageUrl = item.image ? await copySeedAssetToUploads(item.image, 'items') : null;

      await tx.item.create({
        data: {
          id: item.id,
          ownerUserId,
          name: item.name,
          description: item.description,
          imageUrl,
          slotType: item.slotType,
          rarity: item.rarity,
          price: item.price,
          strength: item.strength,
          charisma: item.charisma,
          agility: item.agility,
          intelligence: item.intelligence,
          durability: item.durability,
        },
      });

      itemIdByCode.set(item.code, item.id);
    }

    for (const user of users) {
      if (!user.equipment) {
        continue;
      }

      const userId = userIdByUsername.get(user.username);
      if (!userId) {
        throw new Error(`Cannot resolve user for equipment: ${user.username}`);
      }

      const equipmentEntries = Object.entries(user.equipment) as Array<
        [keyof SeedUserEquipment, string]
      >;
      for (const [slotKey, itemCode] of equipmentEntries) {
        if (!itemCode) {
          continue;
        }

        const itemId = itemIdByCode.get(itemCode);
        if (!itemId) {
          throw new Error(`Cannot resolve equipment item code: ${itemCode}`);
        }

        await tx.userEquipmentSlot.upsert({
          where: {
            userId_slotType: {
              userId,
              slotType: SLOT_MAP[slotKey],
            },
          },
          update: {
            itemId,
          },
          create: {
            userId,
            slotType: SLOT_MAP[slotKey],
            itemId,
          },
        });
      }
    }

    for (const task of tasks) {
      const imageUrl = task.image ? await copySeedAssetToUploads(task.image, 'tasks') : null;

      await tx.task.create({
        data: {
          id: task.id,
          type: task.type,
          title: task.title,
          description: task.description,
          image: imageUrl,
          rewardMoney: task.rewardMoney,
          rewardGameScore: task.rewardGameScore,
          rewardAttributes: toNullableJsonValue(task.rewardAttributes),
          requiresProofImage: task.requiresProofImage,
          submissionLimit: task.submissionLimit,
        },
      });
    }
  });

  console.info(
    `Seed completed: ${users.length} users, ${items.length} items, ${tasks.length} tasks created.`,
  );
}

async function readSeedArray<T>(fileName: string): Promise<T[]> {
  const filePath = join(SEED_DATA_DIR, fileName);
  const content = await readFile(filePath, 'utf-8');

  const parsed: unknown = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error(`Seed file must contain an array: ${filePath}`);
  }

  return parsed as T[];
}

function validateSeedConsistency(users: SeedUser[], items: SeedItem[]): void {
  const usernameSet = new Set(users.map((user) => user.username));
  const itemByCode = new Map(items.map((item) => [item.code, item]));

  for (const item of items) {
    if (item.ownerUsername && !usernameSet.has(item.ownerUsername)) {
      throw new Error(`Item ${item.code} references unknown owner username: ${item.ownerUsername}`);
    }

    if (!Object.values(EquipmentSlotType).includes(item.slotType)) {
      throw new Error(`Item ${item.code} has unsupported slot type: ${item.slotType}`);
    }

    if (!Object.values(ItemRarity).includes(item.rarity)) {
      throw new Error(`Item ${item.code} has unsupported rarity: ${item.rarity}`);
    }
  }

  for (const user of users) {
    if (!user.equipment) {
      continue;
    }

    const equipmentEntries = Object.entries(user.equipment) as Array<
      [keyof SeedUserEquipment, string]
    >;

    for (const [slotKey, itemCode] of equipmentEntries) {
      const item = itemByCode.get(itemCode);

      if (!item) {
        throw new Error(`User ${user.username} references unknown item code: ${itemCode}`);
      }

      if (item.ownerUsername !== user.username) {
        throw new Error(
          `User ${user.username} cannot equip ${itemCode} because owner is ${item.ownerUsername ?? 'null'}`,
        );
      }

      if (item.slotType !== SLOT_MAP[slotKey]) {
        throw new Error(
          `User ${user.username} equips ${itemCode} into ${slotKey}, but item slot is ${item.slotType}`,
        );
      }
    }
  }
}

async function copySeedAssetToUploads(
  relativeAssetPath: string,
  uploadFolder: 'avatars' | 'items' | 'tasks',
): Promise<string> {
  if (isAbsolute(relativeAssetPath)) {
    throw new Error(`Seed asset path must be relative: ${relativeAssetPath}`);
  }

  const normalizedRelativePath = normalize(relativeAssetPath);
  const sourcePath = resolve(SEED_ASSETS_DIR, normalizedRelativePath);
  const resolvedAssetsRoot = resolve(SEED_ASSETS_DIR);
  const pathFromAssetsRoot = relative(resolvedAssetsRoot, sourcePath);

  if (pathFromAssetsRoot.startsWith('..') || isAbsolute(pathFromAssetsRoot)) {
    throw new Error(`Seed asset path escapes seed/assets directory: ${relativeAssetPath}`);
  }

  await assertFileExists(sourcePath, relativeAssetPath);

  const extension = extname(sourcePath).toLowerCase();
  if (!extension) {
    throw new Error(`Seed asset file must have extension: ${relativeAssetPath}`);
  }

  const uploadDirectory = join(UPLOADS_DIR, uploadFolder);
  await mkdir(uploadDirectory, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const destinationPath = join(uploadDirectory, fileName);

  await copyFile(sourcePath, destinationPath);

  return `/uploads/${uploadFolder}/${fileName}`;
}

async function assertFileExists(absolutePath: string, originalPath: string): Promise<void> {
  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      throw new Error();
    }
  } catch {
    throw new Error(`Seed asset not found: ${originalPath} (expected at ${absolutePath})`);
  }
}

function toNullableJsonValue(
  value: SeedTaskRewardAttributes | null,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return value;
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
