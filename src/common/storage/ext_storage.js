import Ext from '../web_extension'

const local = Ext.storage.local

export default {
  get: (key) => {
    return local.get(key).then(obj => obj[key])
  },

  set: (key, value) => {
    return local.set({[key]: value}).then(() => true)
  },

  remove: (key) => {
    return local.remove(key).then(() => true)
  },

  clear: () => {
    return local.clear().then(() => true)
  },

  addListener: (fn) => {
    Ext.storage.onChanged.addListener((changes, areaName) => {
      const list = Object.keys(changes).map(key => ({ ...changes[key], key }))
      fn(list)
    })
  }
}
