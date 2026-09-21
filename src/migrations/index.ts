import * as migration_20260921_085427_initial from './20260921_085427_initial';

export const migrations = [
  {
    up: migration_20260921_085427_initial.up,
    down: migration_20260921_085427_initial.down,
    name: '20260921_085427_initial'
  },
];
