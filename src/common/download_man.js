import Ext from './web_extension'
import log from './log'
import { until } from './utils'

export class DownloadMan {
  activeDownloads = []
  eventsBound = false

  /*
   * Private methods
   */

  isActive () {
    return this.activeDownloads.length > 0
  }

  findById (id) {
    return this.activeDownloads.find(item => item.id === id)
  }

  filterActiveDownloads = (predicate) => {
    this.activeDownloads = this.activeDownloads.filter(predicate)

    if (this.activeDownloads.length === 0) {
      this.unbindEvents()
    }
  }

  createdListener = (downloadItem) => {
    if (!this.isActive())  return
    log('download on created', downloadItem)

    const item = this.activeDownloads.find(item => !item.id)
    if (!item)  return

    // Note: 3 things to do on download created
    // 1. record download id
    // 2. Start timer for timeout
    // 3. Start interval timer for count down message
    Object.assign(item, {
      id: downloadItem.id,
      ...(!item.wait && item.timeout > 0 ? {} : {
        timeoutTimer: setTimeout(() => {
          item.reject(new Error(`download timeout ${item.timeout / 1000}s`))
          this.filterActiveDownloads(d => item.uid !== d.uid)
        }, item.timeout),

        countDownTimer: setInterval(() => {
          if (!this.countDownHandler)  return

          const { past = 0 } = item
          const newPast = past + 1000

          this.countDownHandler({
            total: item.timeout,
            past: newPast
          })
          Object.assign(item, { past: newPast })
        }, 1000)
      })
    })
  }

  changedListener = (downloadDelta) => {
    if (!this.isActive())  return
    log('download on changed', downloadDelta)

    const item = this.findById(downloadDelta.id)
    if (!item)  return

    if (downloadDelta.state) {
      let fn = () => {}
      let done = false

      switch (downloadDelta.state.current) {
        case 'complete':
          fn = () => item.resolve(true)
          done = true
          break

        case 'interrupted':
          fn = () => item.reject(new Error('download interrupted'))
          done = true
          break
      }

      // Remove this download item from our todo list if it's done
      if (done) {
        clearTimeout(item.timeoutTimer)
        clearInterval(item.countDownTimer)
        this.filterActiveDownloads(item => item.id !== downloadDelta.id)
      }

      // resolve or reject that promise object
      fn()
    }
  }

  determineFileNameListener = (downloadItem, suggest) => {
    if (!this.isActive())  return

    log('download on determine', downloadItem)

    const item = this.findById(downloadItem.id)
    if (!item)  return

    const tmpName   = item.fileName.trim()
    const fileName  = tmpName === '' || tmpName === '*' ? null : tmpName

    if (fileName) {
      return suggest({
        filename: fileName,
        conflictAction: 'uniquify'
      })
    }
  }

  bindEvents () {
    if (this.eventsBound) return

    Ext.downloads.onCreated.addListener(this.createdListener)
    Ext.downloads.onChanged.addListener(this.changedListener)

    // Note: only chrome supports api `chrome.downloads.onDeterminingFilename`
    if (Ext.downloads.onDeterminingFilename) {
      Ext.downloads.onDeterminingFilename.addListener(this.determineFileNameListener)
    }

    this.eventsBound = true
  }

  unbindEvents () {
    if (!this.eventsBound)  return

    if (Ext.downloads.onCreated.removeListener) {
      Ext.downloads.onCreated.removeListener(this.createdListener)
    }

    if (Ext.downloads.onChanged.removeListener) {
      Ext.downloads.onChanged.removeListener(this.changedListener)
    }

    if (Ext.downloads.onDeterminingFilename && Ext.downloads.onDeterminingFilename.removeListener) {
      Ext.downloads.onDeterminingFilename.removeListener(this.determineFileNameListener)
    }

    this.eventsBound = false
  }

  /*
   * Public methods
   */

  reset () {
    this.activeDownloads.forEach(item => {
      if (item.timeoutTimer) clearTimeout(item.timeoutTimer)
      if (item.countDownTimer) clearInterval(item.countDownTimer)
    })
    this.activeDownloads = []
    this.unbindEvents()
  }

  prepareDownload (fileName, options = {}) {
    const downloadToCreate = this.activeDownloads.find(item => !item.id)
    if (downloadToCreate) throw new Error('only one not-created download allowed at a time')

    this.bindEvents()

    const opts = Object.assign({
      timeoutForStart: 10000,
      timeout: 60000,
      wait: false
    }, options)

    const promise = new Promise((resolve, reject) => {
      const uid = Math.floor(Math.random() * 1000) + new Date() * 1

      // Note: we need to cache promise object, so have to wait for next tick
      setTimeout(() => {
        this.activeDownloads.push({
          uid,
          resolve,
          reject,
          fileName,
          promise,
          timeoutForStart:  opts.timeoutForStart,
          timeout:          opts.timeout,
          wait:             opts.wait
        })
      }, 0)
    })

    return promise
  }

  waitForDownloadIfAny () {
    const downloadToCreate = this.activeDownloads.find(item => !item.id)
    if (downloadToCreate) {
      return until('download start', () => {
        return {
          pass: !!downloadToCreate.id,
          result: true
        }
      }, 50, downloadToCreate.timeoutForStart)
      .then(() => this.waitForDownloadIfAny())
    }

    // Note: check if id exists, because it means this download item is created
    const downloadToComplete = this.activeDownloads.find(item => item.wait && item.id)
    if (!downloadToComplete)  return Promise.resolve(true)
    return downloadToComplete.promise.then(() => this.waitForDownloadIfAny())
  }

  onCountDown (fn) {
    this.countDownHandler = fn
  }
}

export const getDownloadMan = (function () {
  let instance

  return () => {
    if (!instance) {
      instance = new DownloadMan()
    }

    return instance
  }
})()
