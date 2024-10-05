
export enum MigrationJobType {
  MigrateMacroTestSuiteToBrowserFileSystem = '20190401_macro_test_suite_to_browser_fs'
}

export enum MigrationResult {
  AlreadyMigrated,
  NotQualified,
  Success,
  Error,
  JobUnknown
}

export type MigrationRecord = {
  id:      string;
  jobType: MigrationJobType;
  result:  MigrationResult;
  runAt:   number;
}

export type MigrationJobMeta = {
  createdAt: number;
  goal:      string;
}

export type VersionRange = string;

export interface IMigrationJob {
  getMeta:          () => MigrationJobMeta;
  getType:          () => MigrationJobType;
  shouldMigrate:    () => Promise<boolean>;
  migrate:          () => Promise<boolean>;
  previousVersionRange: () => VersionRange;
}

export interface IMigrationStorage {
  get:    (type: MigrationJobType) => Promise<MigrationRecord | null>;
  set:    (type: MigrationJobType, data: MigrationRecord) => Promise<boolean>;
  getAll: () => Promise<MigrationRecord[]>;
}

export type MigrationServiceOptions = {
  jobs:     IMigrationJob[];
  storage:  IMigrationStorage;
}

export interface IMigrationService {
  runAll:     (previousVersion: string, currentVersion: string) => Promise<Record<MigrationJobType, MigrationResult>>;
  runType:    (type: MigrationJobType) => Promise<MigrationResult>;
  isMigrated: (type: MigrationJobType) => Promise<boolean>;
  getRecords: () => Promise<MigrationRecord[]>;
}
