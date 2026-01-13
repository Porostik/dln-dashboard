import type { Migration } from 'kysely';

import * as m001 from './001_init';

export const migrations: Record<string, Migration> = {
  '001_init': { up: m001.up, down: m001.down },
};
