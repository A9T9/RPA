import Ext from './web_extension'
import log from './log'
import { until } from './utils'
import { delay } from './ts_utils'

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

    // keep listening while an expired arm's file may still turn up — the
    // late-arrival note (30.8) needs onCreated after the list has emptied
    if (this.activeDownloads.length === 0 && !(this.orphans && this.orphans.length)) {
      this.unbindEvents()
    }
  }

  createdListener = (downloadItem) => {
    // no arm open AND no expired arm whose file may still turn up: not ours
    if (!this.isActive() && !(this.orphans && this.orphans.length))  return
    log('download on created', downloadItem)

    const item = this.activeDownloads.find(item => !item.id)
    this.pruneOrphans()
    if (!item) {
      // No arm open. A download that appears now while an earlier arm timed
      // out is that trigger's file arriving LATE — released by Chrome's
      // "download multiple files" Allow, or a slow server (OPEN-ISSUES 30.8).
      // Say so, with the site's own name for it, instead of letting it land
      // silently under a name nobody asked for.
      const orphan = this.orphans.shift()
      if (orphan && this.noteHandler) {
        const lateS = Math.round((Date.now() - orphan.at) / 1000)
        const dl = downloadItem
        setTimeout(() => {
          Ext.downloads.search({ id: dl.id }).then(([d]) => {
            const name = (d && d.filename) ? String(d.filename).replace(/^.*[\\/]/, '') : (dl.filename || dl.url || '').replace(/^.*[\\/]/, '')
            this.noteHandler({ warning: 'a download arrived ' + lateS + ' s AFTER uiv.download gave up waiting for it' + (orphan.fileName ? ' (' + orphan.fileName + ')' : '') + " — the file from that earlier trigger, landing under the site's own name \"" + name + '". Chrome held it behind its "download multiple files" prompt until Allow was clicked, or the server was slow: allow automatic downloads for the site, use {blob: true}, or raise !TIMEOUT_WAIT.' })
          }).catch(() => {})
        }, 1500)
      }
      return
    }
    // An arm IS open but earlier arms in this run expired: this download may
    // be one of THOSE, released late — it gets the name this arm asked for,
    // and the completion carries a warning so the log says to check it.
    if (this.orphans.length) {
      item.orphanWarning = this.orphans.length
      this.orphans.shift()
    }

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

          if (this.completeHandler) {
            Ext.downloads.search({ id: item.id })
            .then(([ downloadItem ]) => {
              if (downloadItem) {
                // the same file again in this run: same URL, or the same
                // site-proposed name with the same size (OPEN-ISSUES 30.12)
                const size = downloadItem.fileSize || downloadItem.totalBytes || 0
                const now = Date.now()
                const dup = (this.recent || []).find(r => (r.url && r.url === downloadItem.url) || (item.siteName && r.siteName === item.siteName && r.size === size))
                this.recent = (this.recent || []).filter(r => now - r.at < 30 * 60 * 1000)
                this.recent.push({ url: downloadItem.url, siteName: item.siteName || '', size, at: now, name: String(downloadItem.filename || '').replace(/^.*[\\/]/, '') })
                this.completeHandler(Object.assign({}, downloadItem, {
                  uivSiteName: item.siteName || '',
                  uivOrphanWarning: item.orphanWarning || 0,
                  uivDuplicateOf: dup ? { name: dup.name, secondsAgo: Math.round((now - dup.at) / 1000) } : null
                }));
              }
            });
          }
          break

        case 'interrupted': {
          // Chrome's reason (SERVER_FORBIDDEN, NETWORK_FAILED, USER_CANCELED …)
          const reason = downloadDelta.error && downloadDelta.error.current ? downloadDelta.error.current : 'unknown reason'
          const err = new Error(`download interrupted (${reason})`)
          fn = () => item.reject(err)
          done = true
          // A waiter that arrives AFTER this settles finds the list empty and
          // would report "nothing to wait for" — keep the outcome for it
          // (OPEN-ISSUES 19.1: saveItem on a session-bound link returned ''
          // and no file, the refusal never surfaced).
          if (item.wait) this.lastInterrupted = { error: err.message, at: Date.now() }
          break
        }
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

    // the name the SITE proposed, before our rename — logged next to the
    // renamed path so a late file from an earlier trigger is recognisable
    item.siteName = String(downloadItem.filename || '').replace(/^.*[\\/]/, '')

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

    // onDeterminingFilename is NOT registered here: Chrome allows only ONE
    // listener per extension for that event ("Too many listeners." on the
    // second addListener), and the background registers its own at startup
    // for blob-export naming. That single listener dispatches to
    // determineFileNameListener for downloads this DownloadMan owns — see
    // the onDeterminingFilename block in src/ext/bg.js.

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
    // the run is over: a file that turns up now has no run log to land in
    this.orphans = []
    this.recent = []
    this.unbindEvents()
  }

  prepareDownload (fileName, options = {}) {
    const downloadToCreate = this.activeDownloads.find(item => !item.id)
    if (downloadToCreate) throw new Error('only one not-created download allowed at a time')

    this.bindEvents()
    this.lastArmAt = Date.now()
    this.lastInterrupted = null

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
      .catch(e => {
        // The trigger started nothing within the start window: release the
        // arm. Leaving the not-created item behind made every later
        // prepareDownload in the same run fail with "only one not-created
        // download allowed at a time" (a JS script's uiv.download loop died
        // on the first slow file and could not recover).
        this.orphans.push({ at: Date.now(), fileName: downloadToCreate.fileName || '' })
        if (this.orphans.length > 20) this.orphans.shift()
        this.dropPending(downloadToCreate, e)
        throw e
      })
      .then(() => this.waitForDownloadIfAny())
    }

    // Note: check if id exists, because it means this download item is created
    const downloadToComplete = this.activeDownloads.find(item => item.wait && item.id)

    // created AND interrupted before this wait arrived: the item is gone and
    // its rejection went nowhere — report the interruption instead of a
    // clean "nothing to wait for" (OPEN-ISSUES 19.1)
    if (!downloadToComplete && this.lastInterrupted && this.lastInterrupted.at >= (this.lastArmAt || 0)) {
      const err = this.lastInterrupted.error
      this.lastInterrupted = null
      return Promise.reject(new Error(err))
    }

    // A short delay after download is complete, so that background has time to send DOWNLOAD_COMPLETE event before it unblocks next command
    if (!downloadToComplete)  return delay(() => true, 500)
    return downloadToComplete.promise.then(() => this.waitForDownloadIfAny())
  }

  onCountDown (fn) {
    this.countDownHandler = fn
  }

  onDownloadComplete (fn) {
    this.completeHandler = fn
  }

  // a line for the run log that belongs to no single arm (a late arrival)
  onNote (fn) {
    this.noteHandler = fn
  }

  // arms whose start window expired: their files may still turn up (30.8)
  orphans = []

  pruneOrphans () {
    const cutoff = Date.now() - 10 * 60 * 1000
    this.orphans = this.orphans.filter(o => o.at > cutoff)
  }

  hasPendingDownload () {
    const downloadToCreate = this.activeDownloads.find(item => !item.id)
    return !!downloadToCreate
  }

  // Forget an armed-but-not-started download (start window expired, or the
  // script's trigger threw before anything could start). Its promise is
  // settled so nothing awaits it forever; the arm is free again afterwards.
  dropPending (item, reason) {
    if (!item) return
    if (item.timeoutTimer) clearTimeout(item.timeoutTimer)
    if (item.countDownTimer) clearInterval(item.countDownTimer)
    this.filterActiveDownloads(d => d.uid !== item.uid)
    // a rejected, never-awaited promise would surface as "unhandled" in the
    // background console — swallow it there, the caller has its own error
    item.promise.catch(() => {})
    item.reject(reason instanceof Error ? reason : new Error(String(reason || 'download cancelled')))
  }

  cancelPendingDownload (reason) {
    const downloadToCreate = this.activeDownloads.find(item => !item.id)
    if (!downloadToCreate) return false
    this.dropPending(downloadToCreate, reason || 'download cancelled before it started')
    return true
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
