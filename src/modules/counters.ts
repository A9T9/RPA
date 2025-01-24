import { Counter } from '@/common/counter/counter'
import { getLicenseService } from '@/services/license'
import { getOcrCommandCounter } from '@/services/ocr/command_counter'


export const ocrCmdCounter = getOcrCommandCounter({
  initial: 0,
  getMax: () => getLicenseService().getMaxOcrCalls(),
  onMax: (cur, max, initial) => {
    throw new Error(`OCR conversion limit reached`)
  }
})

export const xCmdCounter = new Counter({
  initial: 0,
  getMax: () => getLicenseService().getMaxXCommandCalls(),
  onMax: (cur, max, initial) => {
    throw new Error(`XClick/XClickText/XClickTextRelative/XMoveText/XMoveTextRelative/XMove/XType ${max} commands limit reached`)
  }
})

export const proxyCounter = new Counter({
  initial: 0,
  getMax: () => getLicenseService().getMaxProxyCalls(),
  onMax: (cur, max, initial) => {
    throw new Error(`PROXY ${max} commands limit reached`)
  }
})
