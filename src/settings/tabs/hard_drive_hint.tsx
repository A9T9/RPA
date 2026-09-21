// "Hard-drive mode recommended" — shown where it matters: the Desktop App
// tab (the app can only see macro FILES) and the XModules tab (the host is
// installed, so hard-drive mode is available). One click switches, the
// same flow as Settings > General's selector.
import React from 'react'
import { Alert, Button, Modal, message } from 'antd'
import { getStorageManager, StorageStrategyType, StorageTarget, requestCrossPageForceReload } from '@/services/storage'
import { hostConnectDiagnosisOf } from '@/services/xmodules2/native'

// The native host could not be reached: show WHY and what to do (the
// browser's reason classified by diagnoseHostConnectError) in a dialog —
// a 6-second toast saying "not installed" is what sent users reinstalling
// a working install (OPEN-ISSUES 67).
function showHostError (what: string, e: any) {
  const diag = hostConnectDiagnosisOf(e)
  if (!diag) {
    message.error(`${what}: ${e && e.message ? e.message : e}`, 8)
    return
  }
  Modal.error({
    title: `${what}: ${diag.title}`,
    width: 640,
    content: <div style={{ whiteSpace: 'pre-wrap' }}>{diag.detail}</div>
  })
}

interface Props {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
  reason: string
}

export default class HardDriveHint extends React.Component<Props, { busy: boolean; copying: boolean }> {
  state = { busy: false, copying: false }

  // Copy EVERY macro from browser storage into the hard-drive macro folder,
  // folders included. Existing files are listed and only overwritten after
  // an explicit OK — the folder may hold the user's own edited copies.
  copyToDisk = () => {
    const man = getStorageManager()
    const pathLib = man.getMacroStorage().getPathLib()
    this.setState({ copying: true })
    man.isStrategyTypeAvailable(StorageStrategyType.XFile)
      .then((ok: boolean) => {
        if (!ok) throw new Error('hard-drive storage is not available (is Desktop Automation installed and the home folder set?)')
        const src = man.getStorageForTarget(StorageTarget.Macro, StorageStrategyType.Browser)
        const dst = man.getStorageForTarget(StorageTarget.Macro, StorageStrategyType.XFile)
        return src.readR('/', 'Text').then((items: Array<{ filePath: string; content: any }>) => {
          const macros = items.filter(i => i && i.content).map(i => ({ rel: src.relativePath(i.filePath), content: i.content }))
          if (!macros.length) throw new Error('there are no macros in browser storage')
          return Promise.all(macros.map(m => dst.fileExists(m.rel).catch(() => false))).then((exists: boolean[]) => {
            const clashes = macros.filter((_, i) => exists[i]).map(m => m.rel)
            const write = () => macros.reduce((p: Promise<any>, m) => p.then(() => {
              const dir = pathLib.dirname(m.rel)
              const copy = { ...m.content }
              delete copy.status
              const ensure = dir && dir !== '.' && dir !== '/' ? dst.ensureDirectory(dir) : Promise.resolve()
              return ensure.then(() => dst.write(m.rel, copy))
            }), Promise.resolve()).then(() => {
              message.success(`${macros.length} macro${macros.length === 1 ? '' : 's'} copied to the hard-drive macro folder`, 5)
              try { requestCrossPageForceReload() } catch (e) { /* tree refresh is cosmetic */ }
            })
            if (!clashes.length) return write()
            return new Promise<void>((resolve) => {
              Modal.confirm({
                title: `${clashes.length} file${clashes.length === 1 ? '' : 's'} would be overwritten`,
                content: (
                  <div>
                    <p>These macros already exist in the hard-drive folder and would be replaced by the browser-storage version:</p>
                    <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>{clashes.slice(0, 40).join('\n')}{clashes.length > 40 ? `\n… and ${clashes.length - 40} more` : ''}</pre>
                    <p>{macros.length - clashes.length} other macro{macros.length - clashes.length === 1 ? '' : 's'} would be added without conflict.</p>
                  </div>
                ),
                okText: 'Overwrite and copy all',
                okType: 'danger',
                cancelText: 'Cancel',
                onOk: () => write().then(resolve, resolve),
                onCancel: () => resolve()
              })
            })
          })
        })
      })
      .catch((e: Error) => showHostError('Copy failed', e))
      .then(() => this.setState({ copying: false }))
  }

  switchNow = () => {
    const man = getStorageManager()
    this.setState({ busy: true })
    man.isStrategyTypeAvailable(StorageStrategyType.XFile)
      .then((ok: boolean) => {
        if (!ok) throw new Error('hard-drive storage is not available')
        this.props.updateConfig({ storageMode: StorageStrategyType.XFile })
        return man.setCurrentStrategyType(StorageStrategyType.XFile)
      })
      .then(() => {
        message.success('Macros are now stored on the hard drive (home folder > macros)', 4)
        Modal.info({
          title: 'Hard-drive mode is on',
          content: (
            <div>
              <p>Macros now live as files in your home folder's <b>macros</b> subfolder (Settings &gt; Desktop Automation &gt; Setup (XModules2) shows the folder).</p>
              <p>Macros that were in browser storage are not moved automatically: use <b>Settings &gt; General &gt; Restore demo macros</b> for the demos, and the macro tree's right-click <b>Copy to Macro Folder</b> for your own macros (switch back to browser mode to see them).</p>
            </div>
          )
        })
      })
      .catch((e: Error) => showHostError('Could not switch to hard-drive mode', e))
      .then(() => this.setState({ busy: false }))
  }

  render () {
    const { config, reason } = this.props
    if (config.storageMode === StorageStrategyType.XFile) return null
    return (
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12, maxWidth: 760 }}
        message="Hard-drive mode recommended"
        description={
          <div>
            <div>{reason} Macros are currently kept inside the browser (browser storage).</div>
            <Button size="small" type="primary" style={{ marginTop: 8 }} loading={this.state.busy} onClick={this.switchNow}>Switch to hard-drive mode now</Button>
            <Button size="small" style={{ marginTop: 8, marginLeft: 8 }} loading={this.state.copying} onClick={this.copyToDisk}>Copy macros from the browser storage to the hard drive</Button>
            <div style={{ color: '#6b7280', marginTop: 6 }}>The copy keeps folders and asks before overwriting files that already exist in the folder.</div>
          </div>
        }
      />
    )
  }
}
