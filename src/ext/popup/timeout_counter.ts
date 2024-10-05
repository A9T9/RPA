import { createListenerRegistry, Listener } from "@/common/registry"

const registry = createListenerRegistry()
const keyTimeoutStatus = 'TIMEOUT_STATUS'
let timer: any

type TimeoutStatusPayload = {
  type: string;
  past: number;
  total: number;
}

export function startSendingTimeoutStatus (timeout: number, type = 'wait', interval = 1000) {
  if (timer) {
    clearInterval(timer)
  }

  let past = 0

  timer = setInterval(() => {
    past += interval

    registry.fire(keyTimeoutStatus, {
      type,
      past,
      total: timeout
    })

    if (past >= timeout) {
      clearInterval(timer)
    }
  }, interval)

  return () => {
    clearInterval(timer)
  }
}

export function clearTimerForTimeoutStatus (): void {
  clearInterval(timer)
}

export function onTimeoutStatus (callback: Listener<TimeoutStatusPayload>): void {
  registry.add(keyTimeoutStatus, callback)
}
