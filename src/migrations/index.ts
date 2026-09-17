import * as migration_20260916_000000_add_post_ko_en_columns from './20260916_000000_add_post_ko_en_columns';

export const migrations = [
  {
    up: migration_20260916_000000_add_post_ko_en_columns.up,
    down: migration_20260916_000000_add_post_ko_en_columns.down,
    name: '20260916_000000_add_post_ko_en_columns'
  },
];
