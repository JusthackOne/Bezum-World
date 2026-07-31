import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

@Injectable()
export class CivilizationRuntimeService {
  now(): Date {
    return new Date();
  }

  random(): number {
    return randomInt(0, 1_000_000) / 1_000_000;
  }
}
