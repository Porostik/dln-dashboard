import type { Migration } from 'kysely';

import * as m001 from './001_init';
import * as m002 from './002_program_id_indexer_state';
import * as m003 from './003_pipelines_state';
import * as m004 from './004_indexer_cursors';

export const migrations: Record<string, Migration> = {
  '001_init': { up: m001.up, down: m001.down },
  '002_program_id_indexer_state': { up: m002.up, down: m002.down },
  '003_pipeline_state': { up: m003.up, down: m003.down },
  '004_indexer_cursors': { up: m004.up, down: m004.down },
};
