import { singletonGetter, flow } from '@/common/ts_utils';
import Ext from '@/common/web_extension'
import { without } from 'lodash';

export type MenuContextType = 'all' | 'page' | 'frame' | 'selection' | 'link' | 'editable' | 'image' | 'video' | 'audio' | 'launcher' | 'browser_action' | 'page_action'

export type MenuItemParam = {
  id:        string;
  title:     string;
  contexts:  MenuContextType[];
  onclick?:   (info: any) => void;
  checked?:  boolean;
  enabled?:  boolean;
  parentId?: boolean;
  documentUrlPatterns?: string[];
  targetUrlPatterns?: string[];
}

export class ContextMenuService {
  private menuInfos: MenuItemParam[] = []
  private bound = false

  createMenus (menuInfos: MenuItemParam[]): Promise<void> {
    this.menuInfos = menuInfos
    this.bindOnClick()

    return flow(
      ...menuInfos.map(info => () => {
        const copy = {...info}
        delete copy.onclick
        return Ext.contextMenus.create(copy)
      })
    )
    .then(() => {})
  }

  destroyMenus (): Promise<void> {
    this.menuInfos = []
    return Ext.contextMenus.removeAll()
  }

  private bindOnClick(): void {
    if (this.bound) {
      return
    }

    this.bound = true

    Ext.contextMenus.onClicked.addListener((info: any, tab: any) => {
      const id = info.menuItemId

      for (let i = 0, len = this.menuInfos.length; i < len; i++) {
        if (this.menuInfos[i].id === id) {
          this.menuInfos[i].onclick?.(info)
          break
        }
      }
    })
  }
}

export const getContextMenuService = singletonGetter(() => new ContextMenuService())
