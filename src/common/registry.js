export default class Registry {
  constructor ({ process, onZero, onOne }) {
    this.cache = {}
    this.__process = process
    this.__onZero  = onZero || (() => {})
    this.__onOne   = onOne || (() => {})
  }

  add (id, obj) {
    this.cache[id] = this.cache[id] || []
    this.cache[id].push(obj)

    if (this.cache[id].length === 1) {
      try { this.__onOne(id) } catch (e) { console.error('in onOne, ' + e.message) }
    }

    return true
  }

  remove (id, obj) {
    if (!this.cache[id])  return false
    this.cache[id] = this.cache[id].filter(item => item !== obj)

    if (this.cache[id].length === 0) {
      try { this.__onZero(id) } catch (e) { console.error('in onZero, ' + e.message) }
    }

    return true
  }

  fire (id, data) {
    if (!this.cache[id])  return false
    this.cache[id].forEach(item => {
      try { this.__process(item, data, id) } catch (e) { console.error('in process, ' + e.message) }
    })
    return true
  }

  has (id) {
    return this.cache[id] && this.cache[id].length > 0
  }

  keys () {
    return Object.keys(this.cache).filter(key => this.cache[key] && this.cache[key].length > 0)
  }

  destory () {
    this.cache = {}
  }
}
