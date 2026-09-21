import { FolderAddOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, Modal, message } from 'antd';
import keycode from 'keycode';
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as actions from '@/actions';
import { Actions as simpleActions } from '@/actions/simple_actions';
import { createBookmarkOnBar } from '@/common/bookmark';
import * as C from '@/common/constant';
import {
  toBookmarkData
} from '@/common/convert_utils';
import log from '@/common/log';
import { uid } from '@/common/ts_utils';
import M from '@/common/messages';
import { getPlayer } from '@/common/player';
import { waitForRenderComplete } from '@/common/utils';
import { MenuItemType, showContextMenu } from '@/components/context_menu';
import { promptLoopRange } from '@/components/loop_prompt';
import getSaveTestCase from '@/components/save_test_case';
import { FileNodeType, FileTree, collectMacroFileNodes } from '@/components/tree_file';
import { ensureAllUrlsPermission } from '@/common/firefox_permission';
import config from '@/config';
import { getActiveTabId, showPanelWindow } from '@/ext/common/tab';
import { isScriptRunning, runScript } from '@/modules/script_runner';
import { getDesktopAppClient, ensureDesktopApp, macroRunTarget } from '@/services/desktop_app';
import { xmodules2Active } from '@/services/xmodules2/routing';
import {
  getFilteredMacroFileNodeData,
  getMacroFileNodeData,
  getMacroFileNodeList,
  getShouldLoadResources,
  isFocusOnSidebar,
  isMacroFolderNodeListEmpty,
  isPlaying
} from '@/recomputed';
import { RunBy } from '@/reducers/state';
import { getLicenseService } from '@/services/license';
import { Feature } from '@/services/license/types';
import { StorageManagerEvent, StorageStrategyType, StorageTarget, getStorageManager } from '@/services/storage';
import { delayMs } from '../../../../common/utils';
import { ResourceNotLoaded } from '../../../common/resource_not_loaded';

class Files extends React.Component {
  state = {
    showRename: false,
    rename: '',
    folderToImport: '/'
  }

  unbindKeydown = () => {}
  // unbindScroll = () => {}

  // Rename relative
  onClickRename = () => {
    this.props.renameTestCase(this.state.rename, this.state.renameTcId)
      .then(() => {
        message.success('successfully renamed!', 1.5)
        this.toggleRenameModal(false)
      })
      .catch((e) => {
        message.error(e.message, 1.5)
      })
  }

  onCancelRename = () => {
    this.toggleRenameModal(false)
    this.setState({
      rename: null
    })
  }

  onChangeRename = (e) => {
    this.setState({
      rename: e.target.value
    })
  }

  toggleRenameModal = (toShow, macroNode) => {
    this.setState({
      showRename: toShow,
      renameTcId: macroNode && macroNode.fullPath
    })

    if (toShow) {
      setTimeout(() => {
        const input = this.inputRenameTestCase.refs.input
        input.focus()
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 100)
    }
  }

  changeTestCase = (id) => {
    return new Promise((resolve) => {
      // A JS script drives the player ONE COMMAND AT A TIME, so props.status
      // is PLAYER during a uiv.* call and back to NORMAL in the gaps between
      // them. Checking status alone therefore lets a macro be swapped mid-run
      // whenever the click lands in one of those gaps — the run keeps playing
      // a macro the editor no longer holds. isScriptRunning is true for the
      // whole script, gaps included.
      if (this.props.status !== C.APP_STATUS.NORMAL || isScriptRunning())  return resolve(false)
      if (this.props.editing.meta.src && this.props.editing.meta.src.id === id) return resolve(true)

      const go = () => {
        this.props.editTestCase(id)
        resolve(true)
      }

      // Do not ask for save if it's currently on Untitled and no commands in it
      if (this.props.editing.commands.length === 0 && !this.props.editing.meta.src) {
        return go()
      }

      return getSaveTestCase().saveOrNot().then(go)
    })
  }

  // `loops` is a plain count (n rounds) or a {from, to} range from the loop
  // dialog — from > 1 resumes an interrupted job (!LOOP = the absolute round)
  playTestCase = async (id, loops = 1) => {
    if (this.props.status !== C.APP_STATUS.NORMAL)  return
    const { from, to } = (typeof loops === 'object' && loops) ? loops : { from: 1, to: loops }

    // Firefox MV3: same host-permission ask as the panel Play button
    // (10.0.162) — without it an ungranted profile dies with Error #170
    if (!(await ensureAllUrlsPermission())) return

    this.changeTestCase(id)
    .then(shouldPlay => {
      if (!shouldPlay)  return

      setTimeout(() => {
        // JS script macro: run it through the interpreter, not the player.
        // The player's LOOP mode doesn't apply here, so a loop replay is the
        // script run to completion for rounds from..to, stopping on the first
        // round that fails or is stopped manually (same as the classic
        // player default).
        if (typeof this.props.editing.script === 'string') {
          const script   = this.props.editing.script
          // "use desktop-app" on top of the macro, or a "<name>.d.js" macro: run
          // it in the helper app when that is possible (the app runs, or the
          // Desktop Automation module can start it); otherwise say so
          {
            const name = ((this.props.editing.meta && this.props.editing.meta.src && this.props.editing.meta.src.name) || 'macro').replace(/\.js$/i, '') + '.js'
            if (macroRunTarget(name, script) === 'desktop-app') {
              this.runScriptInDesktopApp(name, script).catch(e => message.error(`Desktop app run failed: ${(e && e.message) || e}`, 6))
              return
            }
          }
          const runRound = (round) => {
            if (to > 1 || from > 1) {
              this.props.addLog('status', `Loop round ${round} of ${to}`)
            }

            return runScript(script).then(({ ok }) => {
              if (ok && round < to)  return runRound(round + 1)
            })
          }

          runRound(from).catch(e => {
            message.error(`Script failed to start: ${(e && e.message) || e}`, 3)
          })
          return
        }

        const { commands } = this.props.editing
        const openTc  = commands.find(item => item.cmd.toLowerCase() === 'open')
        const { src } = this.props.editing.meta
        const getMacroName = () => {
          return src && src.name && src.name.length ? src.name : 'Untitled'
        }
        const getMacroId = () => {
          return src ? src.id : C.UNTITLED_ID
        }

        this.props.playerPlay({
          macroId:    getMacroId(),
          title:      getMacroName(),
          extra:      { id: getMacroId() },
          // LOOP even for a single round when from > 1: !LOOP must carry the
          // absolute round number for the resume-from-row workflow
          mode:       (to > 1 || from > 1) ? getPlayer().C.MODE.LOOP : getPlayer().C.MODE.STRAIGHT,
          loopsStart: from,
          loopsEnd:   to,
          startIndex: 0,
          startUrl:   openTc ? openTc.target : null,
          resources:  commands,
          postDelay:  this.props.player.playInterval * 1000
        })
      }, 500)
    })
  }

  // Shared loop dialog — used by the macro and folder context menus. Calls
  // onPlay({from, to}); the classic start/max pair (see components/loop_prompt).
  promptLoopCount = (onPlay) => {
    return promptLoopRange().then(range => {
      if (range) return onPlay(range)
    })
  }

  onJsonOrZipFileChange = (e) => {
    setTimeout(() => {
      this.jsonFileInput.value = null
    }, 500)

    return this.props.importMacroJsonOrZipFiles(e.target.files, this.state.folderToImport)
  }

  addTestCase = () => {
    return getSaveTestCase().saveOrNot().then(() => {
      this.props.macroCreateFile({
        dir:  '/'
      })
    })
  }

  onClickMacroNode = (data, paths, e) => {
    if (data.type === FileNodeType.File) {
      this.changeTestCase(data.id)
    }
  }

  onContextMenuNode = (data, paths, e) => this.showContextMenuForEntry(data, e)

  onToggleNode = (data, paths) => this.props.updateMacroExtra(data.id, { folded: !data.folded })

  onMoveNode = (sourceId, targetId, isDirectory) => {
    this.props.macroMoveEntry({
      entryId:  sourceId,
      dirId:    targetId,
      isSourceDirectory: isDirectory
    })
  }

  onDoubleClickNode = (data, paths, e) => {
    if (data.type === FileNodeType.File) {
      this.playTestCase(data.id)
    }
  }

  applyTreeViewScrollTop = () => {
    delayMs(200).then(() => {
      waitForRenderComplete().then(() => {
        // const { src } = this.props.editing.meta
        // const selectedMacroId = src.id
        const selectedFileNodeElement = document.querySelector('.sidebar-macros .file-node.selected')
        if (selectedFileNodeElement) {
          selectedFileNodeElement.scrollIntoView({ block: 'center' })
        }

        // TODO: remove macroTreeViewScrollTop from config if the change is accepted
        // alternative way to scroll to the last scroll position
        // const lastScrollTop = this.props.config.macroTreeViewScrollTop
        // console.log('render complete macroTreeViewScrollTop:>> ', this.props.config.macroTreeViewScrollTop)
        // const container = document.querySelector('.files-tree-view-container').closest('.ant-tabs-content')
        // container.scrollTo({ top: lastScrollTop, behavior: 'instant' })
      })
    })
  }

  componentDidMount () {
    this.bindKeydown()
    this.applyTreeViewScrollTop()
  }

  bindKeydown () {
    const fn = (e) => {
      if (!this.props.canUseKeyboardShortcuts) {
        return
      }

      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
        return
      }

      // Never steal keys from a text field. This listener is on the DOCUMENT
      // in the CAPTURE phase, so without this check it wins over whatever the
      // user is actually typing in — a CodeMirror editor, a rename box, the AI
      // chat input — and up/down jumps to another macro mid-edit.
      const el = e.target
      const tag = el && el.tagName ? el.tagName.toLowerCase() : ''
      if (tag === 'input' || tag === 'textarea' || tag === 'select' ||
          (el && el.isContentEditable) || (el && el.closest && el.closest('.CodeMirror'))) {
        return
      }


      switch (keycode(e)) {
        case 'up':
          e.preventDefault()
          return this.props.editMacroByOffset(-1)

        case 'down':
          e.preventDefault()
          return this.props.editMacroByOffset(1)
      }
    }

    document.addEventListener('keydown', fn, true)
    this.unbindKeydown = () => document.removeEventListener('keydown', fn, true)
  }

  renderMacros () {
    const { filteredMacroFileNodeData } = this.props

    if (this.props.isLoadingMacros && this.props.isMacroFolderNodeListEmpty) {
      return <div className="no-data">Loading macros...</div>
    }

    // brand-new install (no macros at all, no filter): point to the AI-first
    // flow. A filter with no hits keeps the plain "No macro found" below.
    if (this.props.isMacroFolderNodeListEmpty && filteredMacroFileNodeData.length === 0) {
      return (
        <div className="files-empty-cta">
          <p className="cta-title">No macros yet</p>
          <p className="cta-text">
            Describe what you want in AI Chat — the AI builds the macro for you and saves it here.
          </p>
          <Button type="primary" onClick={() => this.props.updateUI({ sidebarTab: 'AiChat' })}>
            Open AI Chat ✨
          </Button>
        </div>
      )
    }

    return (
      <div className="sidebar-macros">
        {filteredMacroFileNodeData.length === 0 ? (
          <div className="no-data">No macro found</div>
        ) : null}
        <FileTree
          nodes={filteredMacroFileNodeData}
          rootPath={getStorageManager().getMacroStorage().dirPath('')}
          onClick={this.onClickMacroNode}
          onContextMenu={this.onContextMenuNode}
          onToggle={this.onToggleNode}
          onMove={this.onMoveNode}
          onDoubleClick={this.onDoubleClickNode}
        />
      </div>
    )
  }

  showContextMenuForEntry (entry, e) {
    switch (entry.type) {
      case FileNodeType.File:
        return this.showContextMenuForMacro(entry, e)

      case FileNodeType.Folder:
        return this.showContextMenuForFolder(entry, e)
    }
  }

  showContextMenuForFolder (folderEntry, e) {
    e.stopPropagation()
    e.preventDefault()

    return showContextMenu({
      x: e.clientX,
      y: e.clientY,
      onHide: () => {},
      menuItems: [
        {
          type: MenuItemType.Button,
          disabled: !getLicenseService().canPerform(Feature.Edit),
          data: {
            content: 'New macro',
            onClick: () => {
              return getSaveTestCase().saveOrNot().then(() => {
                this.props.macroCreateFile({
                  dir:  folderEntry.entryPath
                })
              });
            }
          }
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'New folder',
            onClick: () => {
              this.props.macroCreateFolder({
                name: 'untitled',
                dir:  folderEntry.entryPath
              })
            }
          }
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Rename',
            onClick: () => {
              this.props.macroRenameFolder({
                dir:  folderEntry.entryPath
              })
            }
          }
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Delete',
            onClick: () => {
              this.props.macroDeleteFolder({
                dir:  folderEntry.entryPath
              })
            }
          }
        },
        {
          type: MenuItemType.Divider,
          data: {}
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Play all in folder',
            onClick: async () => {
              if (!(await ensureAllUrlsPermission())) return

              const folderName = folderEntry.name
              // subfolders included — a folder of only subfolders (like the
              // demo root) used to start an empty suite that "completed"
              // instantly having played nothing
              const macros = collectMacroFileNodes(folderEntry)

              if (macros.length === 0) {
                message.error(`No macros in folder '${folderName}'`, 2)
                return
              }

              getPlayer({ name: 'testSuite' }).play({
                title:      folderName,
                mode:       getPlayer().C.MODE.STRAIGHT,
                startIndex: 0,
                resources:  macros.map(item => ({
                  id:       item.id,
                  loops:    1
                })),
                extra: {
                  id:   folderEntry.id,
                  name: folderName
                }
              })
            }
          }
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Play all in folder in loop..',
            onClick: async () => {
              if (!(await ensureAllUrlsPermission())) return

              const folderName = folderEntry.name
              const macros = collectMacroFileNodes(folderEntry)

              if (macros.length === 0) {
                message.error(`No macros in folder '${folderName}'`, 2)
                return
              }

              return this.promptLoopCount(({ from, to }) => {
                getPlayer({ name: 'testSuite' }).play({
                  title:      folderName,
                  mode:       (to > 1 || from > 1) ? getPlayer().C.MODE.LOOP : getPlayer().C.MODE.STRAIGHT,
                  loopsStart: from,
                  loopsEnd:   to,
                  startIndex: 0,
                  resources:  macros.map(item => ({
                    id:       item.id,
                    loops:    1
                  })),
                  extra: {
                    id:   folderEntry.id,
                    name: folderName
                  }
                })
              })
            }
          }
        },
        {
          type: MenuItemType.Divider,
          data: {}
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Import JSON or ZIP',
            onClick: () => {
              const $selectFile = document.getElementById('select_json_files_for_macros')

              if ($selectFile) {
                this.setState({ folderToImport: folderEntry.entryPath })
                $selectFile.click()
              }
            }
          }
        }
      ]
    })
  }

  onClickEditInIDE = async (id) => {
    this.changeTestCase(id).then(async () => {
      const tabId = await getActiveTabId()
      if (tabId) {
          showPanelWindow()
      }
    })
  }

  playInDesktopApp (macroNode) {
    const addLog = (type, text) => this.props.addLog(type, text)
    return getStorageManager().getMacroStorage().read(macroNode.fullPath, 'Text')
    .then(macro => {
      const data = (macro && macro.data) || {}
      const script = typeof data.script === 'string' ? data.script : (typeof data.Script === 'string' ? data.Script : null)
      if (!script || !script.trim()) {
        message.warning('Only JavaScript macros run in the desktop app (this one is a command table)')
        return
      }
      const name = (macro.name || macroNode.name || 'macro').replace(/\.js$/i, '') + '.js'
      return this.runScriptInDesktopApp(name, script)
    })
    .catch(e => { addLog('error', `[app] ${e.message}`); message.error(e.message, 8) })
  }

  // Send a JS macro to Ui.Vision for Desktop (the helper app) and stream its
  // log into the panel. Used by the context menu and by the Play button when
  // the macro carries the "use desktop-app" directive or a .d.js name (see
  // macroRunTarget).
  runScriptInDesktopApp (name, script) {
    const addLog = (type, text) => this.props.addLog(type, text)
    addLog('status', `[app] sending "${name}" to the desktop app…`)
    this.props.updateUI({ sidebarTab: 'Logs' })
    return ensureDesktopApp(this.props.config, (t) => addLog('info', `[app] ${t}`)).then((r) => {
      if (!r.ok) { addLog('error', `[app] ${r.text}`); message.error(r.text, 8); return { ok: false, error: r.text } }
      return getDesktopAppClient().runScript(name, script, (l) => {
        if (l.kind === 'info') return
        addLog(l.kind === 'echo' ? 'echo' : l.kind === 'error' ? 'error' : 'status', `[app] ${l.text}`)
      }).then((res) => {
        if (res.ok) message.success(`"${name}" completed in the desktop app`, 4)
        else message.error(`"${name}" failed in the desktop app: ${res.error}`, 8)
        return res
      })
    })
  }

  showContextMenuForMacro (macroEntry, event) {
    const { macros } = this.props
    const macroNode = macros.find(item => item.fullPath === macroEntry.id)

    if (!macroNode) {
      return
    }

    event.stopPropagation()
    event.preventDefault()

    const e = {
      clientX: event.clientX,
      clientY: event.clientY,
      stopPropagation: () => {},
      preventDefault: () => {}
    }

    return showContextMenu({
      x: e.clientX,
      y: e.clientY,
      onHide: () => {},
      menuItems: [
        {
          type: MenuItemType.Button,
          data: {
            content: 'Play',
            onClick: () => {
              this.playTestCase(macroNode.fullPath)
            }
          }
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Play in loop..',
            onClick: () => {
              return this.promptLoopCount(loops => {
                this.playTestCase(macroNode.fullPath, loops)
              })
            }
          }
        },
        // JS macros can run in the standalone desktop app (Settings > Desktop
        // App): no browser tab involved, native speed, the app's own log
        // streams back into this panel's log. Shown only when the user has
        // enabled the app — web-automation users never see it.
        true ? {
          type: MenuItemType.Button,
          data: {
            content: 'Play in Desktop App',
            onClick: () => this.playInDesktopApp(macroNode)
          }
        } : null,
        {
          type: MenuItemType.Button,
          data: {
            content: 'Play folder from here',
            onClick: async () => {
              if (!(await ensureAllUrlsPermission())) return

              const macroStorage = getStorageManager().getMacroStorage()
              const path      = macroStorage.getPathLib()
              const dirPath   = path.dirname(macroEntry.entryPath)

              return macroStorage.list(dirPath)
              .then(entries => {
                const macros = entries.filter(entry => entry.isFile)
                const index  = macros.findIndex(macro => macro.fullPath === macroEntry.entryPath)

                if (index === -1) {
                  return
                }

                const folderName = path.basename(dirPath)

                getPlayer({ name: 'testSuite' }).play({
                  title:      folderName,
                  mode:       getPlayer().C.MODE.STRAIGHT,
                  startIndex: index,
                  resources:  macros.map(item => ({
                    id:       item.fullPath,
                    loops:    1
                  })),
                  extra: {
                    id:   dirPath,
                    name: folderName
                  }
                })
              })
            }
          }
        },
        {
          type: MenuItemType.Divider,
          data: {}
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Edit (in sidebar)',
            onClick: () => {
              // open the macro in the side panel Macro tab
              this.changeTestCase(macroNode.fullPath).then(() => {
                this.props.updateUI({ sidebarTab: 'Macro' })
              })
            }
          }
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Edit (in IDE)',
            onClick: () => {
              this.onClickEditInIDE(macroNode.fullPath)
            }
          }
        },
        {
          type: MenuItemType.Divider,
          data: {}
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Rename..',
            onClick: () => {
              return getSaveTestCase().saveOrNot().then(() => {
                this.setState({
                  rename: macroNode.name
                })
                this.toggleRenameModal(true, macroNode)
              });
            }
          }
        },
        {
          type: MenuItemType.Button,
          disabled: !getLicenseService().canPerform(Feature.Edit),
          data: {
            content: 'Duplicate..',
            onClick: () => {
              return getSaveTestCase().saveOrNot().then(() => {
                this.props.duplicateTestCase(macroNode)
              });
            }
          }
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Export as JSON',
            onClick: () => {
              this.props.downloadMacroAsJson(macroNode.fullPath)
            }
          }
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Export as ZIP (json, img & csv)',
            onClick: () => {
              this.props.downloadMacroAsZip(macroNode.fullPath)
            }
          }
        },
        {
          type: MenuItemType.Button,
          data: {
            content: 'Add shortcut to bookmarks bar',
            onClick: () => {
              const bookmarkTitle = window.prompt('Title for this bookmark', `#${macroNode.name}.rpa`)
              if (bookmarkTitle === null) return

              createBookmarkOnBar(toBookmarkData({
                bookmarkTitle,
                path: macroNode.relativePath
              }))
              .then(() => {
                message.success('successfully created bookmark!', 1.5)
              })
            }
          }
        },
        getStorageManager().isXFileMode() ? {
          type: MenuItemType.Button,
          data: {
            content: 'Copy to Local Storage',
            onClick: () => {
              getStorageManager().isStrategyTypeAvailable(StorageStrategyType.Browser)
              .then(() => {
                const macroStorage = getStorageManager().getStorageForTarget(StorageTarget.Macro, StorageStrategyType.Browser)

                return getStorageManager().getStorageForTarget(StorageTarget.Macro, StorageStrategyType.XFile)
                .read(macroNode.fullPath, 'Text')
                .then(macro => {
                  const tcCopy = { ...macro, id: uid() }
                  delete tcCopy.status

                  return macroStorage.write(tcCopy.name, tcCopy)
                  .then(() => message.success('copied'))
                })
              })
              .catch(e => {
                message.warn(e.message)
              })
            }
          }
        } : null,
        getStorageManager().isBrowserMode() ? {
          type: MenuItemType.Button,
          data: {
            content: 'Copy to Macro Folder',
            onClick: () => {
              getStorageManager().isStrategyTypeAvailable(StorageStrategyType.XFile)
              .then(() => {
                const macroStorage = getStorageManager().getStorageForTarget(StorageTarget.Macro, StorageStrategyType.XFile)

                return getStorageManager().getStorageForTarget(StorageTarget.Macro, StorageStrategyType.Browser)
                .read(macroNode.fullPath, 'Text')
                .then(macro => {
                  const tcCopy = { ...macro, id: uid() }
                  delete tcCopy.status

                  return macroStorage.write(tcCopy.name, tcCopy)
                  .then(() => message.success('copied'))
                })
              })
              .catch(e => {
                log.error(e)
                this.props.updateUI({ showXFileNotInstalledDialog: 1 })
              })
            }
          }
        } : null,
        {
          type: MenuItemType.Divider,
          data: {}
        },
        {
          type: MenuItemType.Button,
          disabled: !getLicenseService().canPerform(Feature.Edit),
          data: {
            content: 'Delete',
            onClick: () => {
              const go = () => {
                return this.props.removeTestCase(macroNode.fullPath)
                  .then(() => {
                    message.success('successfully deleted!', 1.5)
                  })
                  .catch(e => {
                    Modal.warning({
                      title: 'Failed to delete',
                      content: e.message
                    })
                  })
              }

              Modal.confirm({
                title: 'Sure to delete?',
                content: `Do you really want to delete "${macroNode.name}"?`,
                okText: 'Delete',
                cancelText: 'Cancel',
                onOk: go,
                onCancel: () => {}
              })
            }
          }
        }
      ]
      .filter(x => x)
    })
  }

  getTestCaseMenuItems () {
    const onClickMenuItem = ({ key }) => {
      switch (key) {
        case 'new_macro_folder': {
          this.props.macroCreateFolder({
            name: 'untitled',
            dir:  '/'
          })
          break
        }

        case 'export_all_backup': {
          // same full backup as Settings > Backup > "Run Backup Now":
          // macros + vision images + CSVs + screenshots in one ZIP
          // (the macros-only "Export All (JSON)" zip it replaced had little use)
          if (this.props.macros.length === 0) {
            return message.error('No saved macros to export', 1.5)
          }

          return Promise.resolve(this.props.runBackup())
          .then(count => {
            const parts = count
              ? [`${count.macro} macros`, `${count.csv} csvs`, `${count.screenshot} screenshots`, `${count.vision} vision images`]
              : []
            message.success(
              parts.length
                ? `Backup created: uivision_backup.zip (${parts.join(', ')}) — check your downloads`
                : 'Backup created: uivision_backup.zip — check your downloads',
              6
            )
          })
          .catch(e => {
            message.error('Backup failed: ' + (e && e.message ? e.message : String(e)), 6)
          })
        }

        case 'import_json': {
          const $selectFile = document.getElementById('select_json_files_for_macros')

          if ($selectFile) {
            this.setState({ folderToImport: '/' })
            $selectFile.click()
          }

          break
        }
      }
    }

    const menuItems = [
      {
        key: 'new_macro_folder',
        label: 'New Folder',
        onClick: () => {
          onClickMenuItem({ key: 'new_macro_folder' })
        }
      },
      {
        key: 'export_all_backup',
        label: 'Export All (Backup)',
        onClick: () => {
          onClickMenuItem({ key: 'export_all_backup' })
        }
      },
      {
        key: 'import_json',
        label: 'Import JSON or ZIP',
        onClick: () => {
          onClickMenuItem({ key: 'import_json' })
        }
      }
    ]

    return menuItems
  }

  renderRenameModal () {
    return (
      <Modal
        title="Rename the macro as.."
        okText="Save"
        cancelText="Cancel"
        open={this.state.showRename}
        onOk={this.onClickRename}
        onCancel={this.onCancelRename}
        className="rename-modal"
      >
        <Input
          style={{ width: '100%' }}
          value={this.state.rename}
          onKeyDown={e => { e.keyCode === 13 && this.onClickRename() }}
          onChange={this.onChangeRename}
          placeholder="macro name"
          ref={el => { this.inputRenameTestCase = el }}
        />
      </Modal>
    )
  }

  renderShowListAction () {
    return (
      <ResourceNotLoaded
        name="Macro list"
        from={this.props.from}
        showList={() => {
          this.props.setFrom(RunBy.Manual)
        }}
      />
    )
  }

  render () {
    if (!this.props.shouldLoadResources) {
      return this.renderShowListAction()
    }

    if (this.props.isPlaying && this.props.macros.length > config.performanceLimit.fileCount) {
      return <div className="hidden-during-replay">{ M.contentHidden }</div>
    }

    return (
      <div className="files-tree-view-container">
        <input
          multiple
          type="file"
          accept=".json, .zip"
          id="select_json_files_for_macros"
          onChange={this.onJsonOrZipFileChange}
          ref={ref => { this.jsonFileInput = ref }}
          style={{display: 'none'}}
        />
        <div className="test-case-actions">
          <Dropdown
            menu={{ items: this.getTestCaseMenuItems() }}
            trigger={['click']}            
          >
          <Button shape="circle">
              <FolderAddOutlined  />   
          </Button>
          </Dropdown>
          <Input.Search style={{ flex: 1 }} placeholder="search macro" value={ this.props.searchText } onChange={ e => this.props.setMacroQuery(e.target.value) } />
          {getStorageManager().isXFileMode() ? (
            // file mode: the tree only knows what the last listing saw —
            // files added, edited or renamed OUTSIDE Ui.Vision (an editor,
            // a git pull) need this nudge. Same action as the IDE's reload
            // icon next to the storage-mode picker.
            <Button
              shape="circle"
              title="Reload the macro tree from the hard drive"
              onClick={() => {
                getStorageManager().emit(StorageManagerEvent.ForceReload)
                message.info('reloaded from hard drive')
              }}
            >
              <ReloadOutlined />
            </Button>
          ) : null}
        </div>
        {this.renderMacros()}
        {this.renderRenameModal()}
      </div>
    )
  }
}

export default connect(
  state => ({
    status: state.status,
    from: state.from,
    ui: state.ui,
    shouldLoadResources: getShouldLoadResources(state),
    isLoadingMacros: state.isLoadingMacros,
    isMacroFolderNodeListEmpty: isMacroFolderNodeListEmpty(state),
    macroFileNodeData: getMacroFileNodeData(state),
    macros: getMacroFileNodeList(state),
    isPlaying: isPlaying(state),
    editing: state.editor.editing,
    player: state.player,
    config: state.config,
    searchText: state.macroQuery,
    filteredMacroFileNodeData: getFilteredMacroFileNodeData(state),
    canUseKeyboardShortcuts: isFocusOnSidebar(state)
  }),
  dispatch => bindActionCreators({...actions, ...simpleActions}, dispatch)
)(Files)
