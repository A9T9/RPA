
import Ext from './web_extension'

// Note: Get ids of bookmarks bar and other bookmarks
const pBookmarksBarId = (function getIdsOfOtherBookmarksAndBookmarksBar () {
  const bookmarksBarIndex = Ext.isFirefox() ? 1 : 0

  return Ext.bookmarks.getTree()
  .then(nodes => {
    const bookmarksBar = nodes[0].children[bookmarksBarIndex]
    return bookmarksBar.id
  })
})()

export const createBookmarkOnBar = (bookmark) => {
  return pBookmarksBarId
  .then(barId => Ext.bookmarks.create({ ...bookmark, parentId: barId }))
}
