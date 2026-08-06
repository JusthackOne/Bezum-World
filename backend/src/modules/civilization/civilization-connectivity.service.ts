import { Injectable } from '@nestjs/common';
import {
  CivilizationAttributeKey,
  CivilizationBuildingType,
  CivilizationTerrainType,
  Prisma,
} from '@prisma/client';

import { CIVILIZATION_ATTRIBUTE_KEYS, findConnectedTerritory, hexKey } from './domain';
import { CivilizationSettlementService } from './civilization-settlement.service';
import {
  CivilizationRepository,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from './repositories';

@Injectable()
export class CivilizationConnectivityService {
  constructor(
    private readonly repository: CivilizationRepository,
    private readonly settlementService: CivilizationSettlementService,
  ) {}

  async recalculate(
    gameId: string,
    now: Date,
    tx: CivilizationTransaction,
  ): Promise<CivilizationStateRecord> {
    const before = await this.repository.findStateById(gameId, tx);
    if (!before) throw new Error(`Civilization game ${gameId} does not exist`);

    await this.settlementService.settleAllResources(before, now, tx);
    const connectedTileIds = new Set<string>();
    const goldIncomeByTeam = new Map<string, Prisma.Decimal>();
    const attributeIncomeByTeam = new Map<string, Map<CivilizationAttributeKey, Prisma.Decimal>>();
    const buildingsByTileId = new Map(
      before.buildings.map((building) => [building.tileId, building]),
    );

    for (const team of before.teams) {
      const townHallTile = before.tiles.find((tile) => tile.id === team.townHallTileId);
      const connectedKeys = townHallTile
        ? findConnectedTerritory(
            before.tiles.map((tile) => ({
              q: tile.q,
              r: tile.r,
              ownerTeamId: tile.ownerTeamId,
              isPassable: tile.terrainType !== CivilizationTerrainType.MOUNTAIN,
            })),
            townHallTile,
            team.id,
          )
        : new Set<string>();
      const teamConnectedTiles = before.tiles.filter((tile) => connectedKeys.has(hexKey(tile)));
      const teamConnectedTileIds = new Set(teamConnectedTiles.map((tile) => tile.id));
      for (const tile of teamConnectedTiles) connectedTileIds.add(tile.id);

      const ordinaryTileCount = teamConnectedTiles.filter(
        (tile) =>
          !buildingsByTileId.has(tile.id) && tile.terrainType === CivilizationTerrainType.GROUND,
      ).length;
      let goldIncome = new Prisma.Decimal(this.parseSettings(before).territoryGoldPerHour).mul(
        ordinaryTileCount,
      );
      const attributeIncome = new Map<CivilizationAttributeKey, Prisma.Decimal>(
        CIVILIZATION_ATTRIBUTE_KEYS.map((key) => [
          key as CivilizationAttributeKey,
          new Prisma.Decimal(0),
        ]),
      );

      for (const building of before.buildings) {
        if (building.ownerTeamId !== team.id || !teamConnectedTileIds.has(building.tileId))
          continue;
        if (building.buildingType === CivilizationBuildingType.GOLD_BUILDING) {
          goldIncome = goldIncome.add(building.incomePerHour);
        } else if (
          building.buildingType === CivilizationBuildingType.ATTRIBUTE_BUILDING &&
          building.attributeKey
        ) {
          attributeIncome.set(
            building.attributeKey,
            (attributeIncome.get(building.attributeKey) ?? new Prisma.Decimal(0)).add(
              building.incomePerHour,
            ),
          );
        }
      }
      goldIncomeByTeam.set(team.id, goldIncome);
      attributeIncomeByTeam.set(team.id, attributeIncome);
    }

    for (const tile of before.tiles) {
      const connected = connectedTileIds.has(tile.id);
      if (tile.isConnected !== connected) {
        await this.repository.updateTile(tile.id, { isConnected: connected }, tx);
      }
    }
    for (const resource of before.teamResources) {
      await this.repository.updateTeamResource(
        resource.id,
        { goldIncomePerHour: goldIncomeByTeam.get(resource.teamId) ?? 0, lastSettledAt: now },
        tx,
      );
    }
    for (const resource of before.attributeResources) {
      await this.repository.updateAttributeResource(
        resource.id,
        {
          incomePerHour:
            attributeIncomeByTeam.get(resource.teamId)?.get(resource.attributeKey) ?? 0,
          lastSettledAt: now,
        },
        tx,
      );
    }
    await this.repository.updateGame(gameId, { stateVersion: { increment: 1 } }, tx);

    return (await this.repository.findStateById(gameId, tx))!;
  }

  private parseSettings(state: CivilizationStateRecord) {
    const settings = state.settingsJson;
    return settings as unknown as import('./domain').CivilizationSettings;
  }
}
