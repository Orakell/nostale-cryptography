'use strict'

const os = require('os')
const path = require('path')
const Utils = require('../utils')

const EncryptLoginStream = require('./login/encrypt_stream')
const EncryptWorldStream = require('./world/encrypt_stream')
const DecryptLoginStream = require('./login/decrypt_stream')
const DecryptWorldStream = require('./world/decrypt_stream')

const NtLauncher = require('./login/nt_launcher')

const platform = os.platform()

const languagesCodes = {
  EN: 0,
  DE: 1,
  FR: 2,
  IT: 3,
  PL: 4,
  ES: 5,
  CZ: 6,
  RU: 7,
  TR: 8
}

module.exports = {
  createCipher (session) {
    if (session == null) {
      return new EncryptLoginStream()
    } else if (Number.isFinite(session)) {
      return new EncryptWorldStream(session)
    }

    throw new TypeError('The first argument must be null/undefined in order to get the Login Cipher or a session number in order to get the World Cipher.')
  },

  createDecipher (session) {
    if (session == null) {
      return new DecryptLoginStream()
    } else if (Number.isFinite(session)) {
      return new DecryptWorldStream(session)
    }

    throw new TypeError('The first argument must be null/undefined in order to get the Login Decipher or a session number in order to get the World Decipher.')
  },

  async createVersion (nosPathOrVersion, languageIso, directx = 'NostaleClientX.exe') {
    let nosPath = null
    let version = null

    if (!languagesCodes.hasOwnProperty(languageIso)) {
      throw new Error(
        'Unknown language iso : ' + languageIso + '. It must be one of these : ' + JSON.stringify(languagesCodes)
      )
    }

    if (await Utils.isDirectory(nosPathOrVersion)) {
      nosPath = nosPathOrVersion
    } else {
      if (nosPathOrVersion == null || nosPathOrVersion.split('.').length !== 4) {
        throw new Error(
          'Invalid Nostale Path/Client version. ' +
          'If you are on Windows you can either choose to provide the nostale path or a valid Client version as first argument. ' +
          'You can find the Client version by right clicking on NostaleClientX.exe > Properties > Details.'
        )
      }

      version = nosPathOrVersion
    }

    const random = [
      0x00,
      Math.floor(Math.random() * 0x7E),
      Math.floor(Math.random() * 0x7E),
      Math.floor(Math.random() * 0x7E)
    ]
    const randomHex = Buffer.from(random).toString('hex').toUpperCase()

    if (version == null) {
      if (platform === 'win32') {
        const sanitizedPath = path.join(nosPath, directx).split('\\').join('\\\\')
        version = (await Utils.exec(`wmic datafile where name="${sanitizedPath}" get Version`)).toString().trim().split('\n').pop()
      } else {
        throw new Error(
          'On Linux/macOS you must provide the Client version as first argument. ' +
          'You can find the Client version by right clicking on NostaleClientX.exe > Properties > Details.'
        )
      }
    }

    return `${randomHex} ${languagesCodes[languageIso]}\v${version}`
  },

  async createChecksumHash (username, nosPath, directx = 'NostaleClientX.exe', opengl = 'NostaleClient.exe') {
    if (!Buffer.isBuffer(username)) {
      throw new TypeError('The first argument must be the username buffer.')
    }
    if (typeof nosPath !== 'string' || !nosPath.length || !(await Utils.isDirectory(nosPath))) {
      throw new TypeError('The second argument must be the NosTale path folder')
    }
    if (typeof directx !== 'string' || !directx.length) {
      throw new TypeError('The third argument must be the NosTale DirectX executable filename (if null/undefined will be set to \'NostaleClientX.exe\').')
    }
    if (typeof opengl !== 'string' || !opengl.length) {
      throw new TypeError('The fourth argument must be the NosTale OpenGL executable filename (if null/undefined will be set to \'NostaleClient.exe\').')
    }

    const directxPath = path.join(nosPath, directx)
    const openglPath = path.join(nosPath, opengl)

    if (!(await Utils.isFile(directxPath))) {
      throw new Error(`The filepath "${directxPath}" doesn't exists. It might be that the NosTale's path or the DirectX filename are invalid.`)
    }
    if (!(await Utils.isFile(openglPath))) {
      throw new Error(`The filepath "${openglPath}" doesn't exists. It might be that the NosTale's path or the OpenGL filename are invalid.`)
    }

    directx = Utils.md5(await Utils.readFile(directxPath))
    opengl = Utils.md5(await Utils.readFile(openglPath))

    return Utils.md5(directx + opengl)
  },

  async getToken (locale, gfLang, installationId, username, password) {
    let ntLauncher = new NtLauncher(locale, gfLang, installationId)

    if (await ntLauncher.auth(username, password)) {
      let accounts = await ntLauncher.getAccounts()
      let accountIds = Object.keys(accounts)
      return ntLauncher.getToken(accountIds[0])
    }

    return false
  },

  getLanguageCodeByIso (isoCode) {
    if (!languagesCodes.hasOwnProperty(isoCode)) {
      throw new Error(
        'Unknown language iso : ' + isoCode + '. It must be one of these : ' + JSON.stringify(languagesCodes)
      )
    }

    return languagesCodes[languageIso]
  }
}
