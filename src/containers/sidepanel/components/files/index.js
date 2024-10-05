import { FolderAddOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, Modal, message } from 'antd';
import JSZip from 'jszip';
import keycode from 'keycode';
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as actions from '@/actions';
import { Actions as simpleActions } from '@/actions/simple_actions';
import * as C from '@/common/constant';
import {
  toJSONString
} from '@/common/convert_utils';
import FileSaver from '@/common/lib/file_saver';
import M from '@/common/messages';
import { getPlayer } from '@/common/player';
import { waitForRenderComplete } from '@/common/utils';
import { MenuItemType, showContextMenu } from '@/components/context_menu';
import { prompt } from '@/components/prompt';
import getSaveTestCase from '@/components/save_test_case';
import { FileNodeType, FileTree } from '@/components/tree_file';
import config from '@/config';
import { getActiveTabId, showPanelWindow } from '@/ext/common/tab';
import {
  getFilteredMacroFileNodeData,
  getMacroFileNodeData,
  getMacroFileNodeList,
  getShouldIgnoreTargetOptions,
  getShouldLoadResources,
  isFocusOnSidebar,
  isMacroFolderNodeListEmpty,
  isPlaying
} from '@/recomputed';
import { RunBy } from '@/reducers/state';
import { getLicenseService } from '@/services/license';
import { Feature } from '@/services/license/types';
import { getStorageManager } from '@/services/storage';
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
      if (this.props.status !== C.APP_STATUS.NORMAL)  return resolve(false)
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

  playTestCase = (id) => {
    if (this.props.status !== C.APP_STATUS.NORMAL)  return

    this.changeTestCase(id)
    .then(shouldPlay => {
      if (!shouldPlay)  return

      setTimeout(() => {
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
          mode:       getPlayer().C.MODE.STRAIGHT,
          startIndex: 0,
          startUrl:   openTc ? openTc.target : null,
          resources:  commands,
          postDelay:  this.props.player.playInterval * 1000
        })
      }, 500)
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
            content: 'Testsuite: Play all in folder',
            onClick: () => {
              const folderName = folderEntry.name
              const macros = folderEntry.children.filter(item => {
                return item.type === FileNodeType.File
              })

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
            content: 'Testsuite: Play in loop',
            onClick: () => {
              const playInLoops = (loopsStr) => {
                const loops = parseInt(loopsStr)

                if (isNaN(loops) || loops < 1) {
                  throw new Error(`Invalid loops: ${loopsStr}`)
                }

                const folderName = folderEntry.name
                const macros = folderEntry.children.filter(item => {
                  return item.type === FileNodeType.File
                })

                getPlayer({ name: 'testSuite' }).play({
                  title:      folderName,
                  mode:       loops === 1 ? getPlayer().C.MODE.STRAIGHT : getPlayer().C.MODE.LOOP,
                  loopsStart: 1,
                  loopsEnd:   loops,
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

              const run = () => {
                return prompt({
                  width: 400,
                  title: 'How many loops?',
                  message: '',
                  value: '2',
                  placeholder: 'Loops',
                  inputType: 'number',
                  selectionStart: 0,
                  selectionEnd: 1,
                  okText: 'Play',
                  cancelText: 'Cancel',
                  onCancel: () => Promise.resolve(true),
                  onOk: playInLoops
                })
                .catch(e => {
                  message.error(e.message)
                  setTimeout(run, 0)
                })
              }

              return run()
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
            content: 'Testsuite: Play from here',
            onClick: () => {
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
          type: MenuItemType.Divider,
          data: {}
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

        case 'export_all_json': {
          const macroStorage = getStorageManager().getMacroStorage()
          const path = macroStorage.getPathLib()
          const zip = new JSZip()
          const getFolder = (relativePath, zipRoot) => {
            const dirs = relativePath.split(/\/|\\/g)

            return dirs.reduce((prev, dir) => {
              return prev.folder(dir)
            }, zipRoot)
          }

          if (this.props.macros.length === 0) {
            return message.error('No saved macros to export', 1.5)
          }

          return Promise.all(
            this.props.macros.map(macroNode => {
              const dirPath   = path.dirname(macroNode.relativePath)
              const fileName  = path.basename(macroNode.relativePath)
              const folder    = getFolder(dirPath, zip)

              return getStorageManager().getMacroStorage().read(macroNode.fullPath, 'Text')
              .then(macro => {
                folder.file(fileName, toJSONString({
                  name:     macro.name,
                  commands: macro.data.commands
                }, {
                  ignoreTargetOptions: this.props.ignoreTargetOptions
                }))
              })
            })
          )
          .then(() => {
            return zip.generateAsync({ type: 'blob' })
            .then(function (blob) {
              FileSaver.saveAs(blob, 'all_test_cases.zip');
            })
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
        key: 'export_all_json',
        label: 'Export All (JSON)',
        onClick: () => {
          onClickMenuItem({ key: 'export_all_json' })
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
    testSuites: state.editor.testSuites,
    editing: state.editor.editing,
    player: state.player,
    config: state.config,
    ignoreTargetOptions: getShouldIgnoreTargetOptions(state),
    searchText: state.macroQuery,
    filteredMacroFileNodeData: getFilteredMacroFileNodeData(state),
    canUseKeyboardShortcuts: isFocusOnSidebar(state) && state.ui.sidebarTab !== 'test_suites'
  }),
  dispatch => bindActionCreators({...actions, ...simpleActions}, dispatch)
)(Files)
