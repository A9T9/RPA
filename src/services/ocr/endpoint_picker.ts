import { KeyValueData } from '../kv_data/common'
import { singletonGetter, flow } from '../../common/ts_utils'
import { OcrServerSanityInfo, OcrServerInfoWithId, OcrServerId } from './types'
import config from '../../config'

class OcrServerKeyValueData extends KeyValueData<OcrServerSanityInfo> {
  static STORAGE_KEY = 'ocr_server_data'

  public getAll (): Promise<Record<OcrServerId, OcrServerSanityInfo>> {
    return super.get("").then(data => data || {}) as any as Promise<Record<OcrServerId, OcrServerSanityInfo>>
  }

  protected getMainKeyAndSubKeys (key: string): [string, string[]] {
    const [mainKey, subKeys] = super.getMainKeyAndSubKeys(key)

    return [
      OcrServerKeyValueData.STORAGE_KEY,
      [mainKey].concat(subKeys).filter(x => x && x.length)
    ]
  }
}

const getOcrServerKeyValueData = singletonGetter(() => new OcrServerKeyValueData())

interface IOcrEndpointPicker {
  randomPick: () => Promise<OcrServerInfoWithId>;
  bestPick:   () => Promise<OcrServerInfoWithId>;
  isAllDown:  () => Promise<boolean>;
  all:        () => Promise<OcrServerInfoWithId[]>;
  reset:      () => Promise<void>;
  use:        (id: OcrServerId) => void;
  report:     (id: OcrServerId, sanityInfo: OcrServerSanityInfo) => Promise<boolean>;
}

type OctEndpointPickerOptions = {
  servers:    OcrServerInfoWithId[];
  resetTime:  number;
}

class OcrEndpointPicker implements IOcrEndpointPicker {
  private servers:    OcrServerInfoWithId[]
  private resetTime:  number
  private lastId:     OcrServerId | null

  constructor (options: OctEndpointPickerOptions) {
    this.servers    = options.servers
    this.resetTime  = options.resetTime
    this.lastId     = null
  }

  all (): Promise<OcrServerInfoWithId[]> {
    return Promise.resolve(this.servers)
  }

  isAllDown (): Promise<boolean> {
    return this.validServers()
    .then(({ servers }) => {
      return servers.length === 0
    })
  }

  randomPick (): Promise<OcrServerInfoWithId> {
    return this.validServers()
    .then(({ servers, serverInfos }) => {
      return servers[randomIndex(servers.length)]
    })
  }

  bestPick (): Promise<OcrServerInfoWithId> {
    return this.validServers()
    .then(({ servers, serverInfos }) => {
      const getTime = (server: OcrServerInfoWithId): number => {
        return serverInfos[server.id] ? serverInfos[server.id].lastTotalMilliseconds : 0
      }

      return servers.reduce((prev, server): OcrServerInfoWithId => {
        if (!prev)  return server
        // Note: These two lines are used to avoid using the same endpoint on two consecutive runs
        // That's not what we want at this comment, so comment it out
        //
        // if (prev.id === this.lastId)    return server
        // if (server.id === this.lastId)  return prev

        const timeA = getTime(prev)
        const timeB = getTime(server)

        switch (Math.sign(timeA - timeB)) {
          case 0:   return Math.random() > 0.5 ? prev : server
          case 1:   return server
          case -1:
          default:  return prev
        }
      })
    })
  }

  reset (): Promise<void> {
    // Note: reset server sanity to null when all servers are down,
    // so that it will check all servers again on next request
    return flow(
      ...this.servers.map(server => {
        return () => getOcrServerKeyValueData().set(server.id, null as any)
      })
    )
    .then(() => {})
  }

  use (id: OcrServerId): void {
    const found = this.servers.find(item => item.id === id)
    if (!found) throw new Error(`No server found with id '${id}'`)
    this.lastId = id
  }

  setSingleServerInstance (server: OcrServerInfoWithId): Promise<OcrServerInfoWithId> {
    if (!server.id) {
      throw new Error('Server id is required')
    }

    if (!server.url) {
      throw new Error('Server url is required')
    }
   
    if (!server.key) {
      throw new Error('Server key is required')
    }
    // remove all servers
    this.servers = []
    // add new server
    this.servers.push(server)
    return Promise.resolve(server)
  }

  report (id: OcrServerId, sanityInfo: OcrServerSanityInfo): Promise<boolean> {
    return getOcrServerKeyValueData().set(id, sanityInfo)
    .then(() => true)
  }

  validServers (): Promise<{ servers: OcrServerInfoWithId[], serverInfos: Record<OcrServerId, OcrServerSanityInfo> }> {
    return getOcrServerKeyValueData().getAll()
    .then(serverInfos => {
      const now     = new Date().getTime()
      const servers = this.servers.filter(server => {
        const info  = serverInfos[server.id]
        if (!info) return true
        if (now - info.lastResponseTimestamp > this.resetTime) return true
        if (info.lastError) return false
        return info.lastTotalMilliseconds <= config.ocr.apiHealthyResponseTime
      })

      if (servers.length === 0) {
        throw new Error('invalid API key') //('All OCR servers are down')
      }

      return {
        servers,
        serverInfos
      }
    })
  }
}

function randomIndex (count: number) {
  return Math.round(Math.random() * count)
}

export const getOcrEndpointPicker = singletonGetter(() => {
  return new OcrEndpointPicker({
    servers:  [],
    resetTime: config.ocr.resetTime
  })
})
