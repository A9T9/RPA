import pbkdf2 from 'pbkdf2'
import aesjs from 'aes-js'
import Ext from './web_extension'
import storage from './storage'

const RAW_PREFIX = '@_KANTU_@'
const CIPHER_PREFIX = '__KANTU_ENCRYPTED__'
const RAW_PREFIX_REG = new RegExp('^' + RAW_PREFIX)
const CIPHER_PREFIX_REG = new RegExp('^' + CIPHER_PREFIX)

const getEncryptConfig = () => {
  return storage.get('config')
  .then(config => ({
    shouldEncrypt: config.shouldEncryptPassword === 'master_password',
    masterPassword: config.masterPassword
  }))
}

export const aesEncrypt = (text, password) => {
  const key     = pbkdf2.pbkdf2Sync(password, 'salt', 1, 256 / 8, 'sha512')
  const engine  = new aesjs.ModeOfOperation.ctr(key)

  return aesjs.utils.hex.fromBytes(
    engine.encrypt(
      aesjs.utils.utf8.toBytes(text)
    )
  )
}

export const aesDecrypt = (text, password) => {
  const key     = pbkdf2.pbkdf2Sync(password, 'salt', 1, 256 / 8, 'sha512')
  const engine  = new aesjs.ModeOfOperation.ctr(key)

  return aesjs.utils.utf8.fromBytes(
    engine.decrypt(
      aesjs.utils.hex.toBytes(text)
    )
  )
}

export const encrypt = (text) => {
  return getEncryptConfig()
  .then(({ shouldEncrypt, masterPassword }) => {
    if (!shouldEncrypt) return text
    return `${CIPHER_PREFIX}${aesEncrypt(RAW_PREFIX + text, masterPassword)}`
  })
}

export const decrypt = (text) => {
  return getEncryptConfig()
  .then(({ shouldEncrypt, masterPassword }) => {
    if (!shouldEncrypt) return text
    const raw = aesDecrypt(text.replace(CIPHER_PREFIX_REG, ''), masterPassword)
    if (raw.indexOf(RAW_PREFIX) !== 0) throw new Error('Wrong master password')
    return raw.replace(RAW_PREFIX_REG, '')
  })
  .catch(e => {
    throw new Error('password string invalid')
  })
}

export const encryptIfNeeded = (text, dom) => {
  if (dom && dom.tagName.toUpperCase() === 'INPUT' && dom.type === 'password') {
    return encrypt(text)
  }

  return Promise.resolve(text)
}

export const decryptIfNeeded = (text, dom) => {
  if (CIPHER_PREFIX_REG.test(text) && dom && dom.tagName.toUpperCase() === 'INPUT' && dom.type === 'password') {
    return decrypt(text)
  }

  return Promise.resolve(text)
}
