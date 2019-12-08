import Dexie from 'dexie'
import { FlatStorage, FileInfo, ReadFileType, Content } from './storage'
import db from '../../models/db'
import { uid } from '../../common/utils'
import { singletonGetterByKey } from '../../common/ts_utils'

export type IndexeddbFlatStorageOptions = {
  table: string
}

export class IndexeddbFlatStorage extends FlatStorage {
  protected table: Dexie.Table<any, string>

  constructor (options: IndexeddbFlatStorageOptions) {
    super()
    const tableName = options.table

    if (!db.tables.find(t => t.name === tableName)) {
      throw new Error(`Unknown indexeddb table name '${tableName}'`)
    }

    this.table = db.table(options.table)
  }

  list (): Promise<FileInfo[]> {
    // Note: must wrap dexie's "Promise", as it's dexie's own thenable Promise
    return Promise.resolve(
      this.table.toArray()
    )
    .then((xs: any[]) => {
      const convert = (x: any): FileInfo => ({
        dir: '',
        fileName:  <string>(x.name),
        lastModified: new Date(),
        size: 'unknown'
      })
      
      return xs.map(convert)
    })
  }

  exists (fileName: string): Promise<boolean> {
    return Promise.resolve(
      this.table
      .where('name')
      .equals(fileName)
      .toArray()
    )
    .then((xs: any[]) => {
      return xs.length > 0
    })
  }

  read (fileName: string, type: ReadFileType): Promise<string | ArrayBuffer | null> {
    if (type !== 'Text') {
      throw new Error(`ReadFileType '${type}' is not supported in indexeddb storage`)
    }

    return this.findByName(fileName)
  }

  readAll (readFileType: ReadFileType = 'Text', onErrorFiles?: Function): Promise<({ fileName: string, content: Content })[]> {
    return Promise.resolve(
      this.table.toArray()
    )
    .then(items => {
      return items.map(item => ({
        fileName: item.name,
        content: item
      }))
    })
  }

  __write (fileName: string, content: Record<string, any>): Promise<void> {
    return this.findByName(fileName)
    .catch(() => null)
    .then((item: any): any => {
      if (item) {
        const data = this.normalize({ ...item, ...content })
        delete data.id
        return this.table.update(item.id, data)
      } else {
        const data = this.normalize({ id: uid(), ...content })
        return this.table.add(data)
      }
    })
    .then(() => {})
  }

  __overwrite (fileName: string, content: Record<string, any>): Promise<void> {
    return this.write(fileName, content)
  }

  __clear (): Promise<void> {
    return Promise.resolve(
      this.table.clear()
    )
  }

  __remove (fileName: string): Promise<void> {
    return this.findByName(fileName)
    .then(item => {
      return this.table.delete(item.id)
    })
  }

  __rename (fileName: string, newName: string): Promise<void> {
    return this.findByName(fileName)
    .then((item: any) => {
      return this.table.update(item.id, { name: newName })
    })
    .then(() => {})
  }

  protected findByName (name: string): Promise<any> {
    return Promise.resolve(
      this.table
      .where('name')
      .equals(name)
      .first()
    )
    .then((item: any) => {
      if (!item)  throw new Error(`indexeddb storage: Item with name '${name}' is not found`)
      return item
    })
  }

  protected normalize (data: any): any {
    return data
  }

  private dataToString (data: any): string {
    return JSON.stringify(data)
  }
}

export const getIndexeddbFlatStorage = singletonGetterByKey<IndexeddbFlatStorage>(
  (opts: IndexeddbFlatStorageOptions) => {
    return opts.table
  },
  (opts: IndexeddbFlatStorageOptions) => {
    return new IndexeddbFlatStorage(opts)
  }
)
