import semver from 'semver'
import {
  IMigrationStorage,
  IMigrationService,
  IMigrationJob,
  MigrationServiceOptions,
  MigrationJobType,
  MigrationRecord,
  MigrationResult
} from './types'
import { uid, flow } from '@/common/ts_utils';

export class MigrationService implements IMigrationService {
  private storage: IMigrationStorage
  private jobs: IMigrationJob[]

  constructor (options: MigrationServiceOptions) {
    this.storage = options.storage
    this.jobs    = options.jobs
  }

  isMigrated (type: MigrationJobType): Promise<boolean> {
    return this.storage.get(type)
    .then((record) => !!record)
  }

  getRecords (): Promise<MigrationRecord[]> {
    return this.storage.getAll()
  }

  runType (type: MigrationJobType): Promise<MigrationResult> {
    return this.isMigrated(type)
    .then((migrated) => {
      if (migrated) {
        return MigrationResult.AlreadyMigrated
      }

      const job = this.findJob(type)

      if (!job) {
        return MigrationResult.JobUnknown
      }

      return job.shouldMigrate()
      .then((pass) => {
        if (!pass) {
          return MigrationResult.NotQualified
        }

        return job.migrate()
        .then(() => MigrationResult.Success)
      })
    })
    .catch((e) => {
      console.error(e)
      return MigrationResult.Error
    })
    .then((result) => {
      if (result !== MigrationResult.Success) {
        return Promise.resolve(result)
      }

      return this.storage.set(type, {
        result,
        id: uid(),
        runAt: new Date().getTime(),
        jobType: type
      })
      .then(() => result)
    })
  }

  runAll (previousVersion: string, currentVersion: string): Promise<Record<MigrationJobType, MigrationResult>> {
    const validJobs = this.jobs.filter((job) => {
      return semver.satisfies(previousVersion, job.previousVersionRange())
    })

    return flow(
      ...validJobs.map((job) => {
        const type = job.getType()

        return () => {
          return this.runType(type)
          .then((result) => ({ type, result }))
        }
      })
    )
    .then((list) => {
      const result = list.reduce((
        prev: Record<MigrationJobType, MigrationResult>,
        cur: { type: MigrationJobType, result: MigrationResult }
      ) => {
        prev[cur.type] = cur.result
        return prev
      }, {} as Record<MigrationJobType, MigrationResult>)

      return result
    })
  }

  private findJob (type: MigrationJobType): IMigrationJob | undefined {
    return this.jobs.find((item) => item.getType() === type)
  }
}
