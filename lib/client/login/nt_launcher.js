'use strict'

const https = require('https')

class NtLauncher {
  constructor (locale, gfLang, installationId) {
    this.locale = locale
    this.gfLang = gfLang
    this.installationId = installationId
    this.token = null
    this.platformUserId = null
  }

  async auth (username, password) {
    let content = JSON.stringify({
      'gfLang': this.gfLang,
      'identity': username,
      'locale': this.locale,
      'password': password,
      'platformGameId': 'dd4e22d6-00d1-44b9-8126-d8b40e0cd7c9'
    })

    const options = {
      hostname: 'spark.gameforge.com',
      path: '/api/v1/auth/thin/sessions',
      port: 443,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
        'TNT-Installation-Id': this.installationId,
        'Origin': 'spark://www.gameforge.com',
        'Content-Type': 'application/json',
        'Content-Length': content.length
      }
    }

    let data = await this.doRequest(options, content)

    if (!data.hasOwnProperty('token') || !data.hasOwnProperty('platformUserId')) {
      return false
    }

    this.token = data['token']
    this.platformUserId = data['platformUserId']

    return true
  }

  async getAccounts () {
    if (!this.token || !this.platformUserId) {
      return false
    }

    const options = {
      hostname: 'spark.gameforge.com',
      path: '/api/v1/user/accounts',
      port: 443,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
        'TNT-Installation-Id': this.installationId,
        'Origin': 'spark://www.gameforge.com',
        'Authorization': 'Bearer ' + this.token,
        'Connection': 'Keep-Alive',
      }
    }

    return await this.doRequest(options)
  }

  async getToken (accountId) {
    if (!this.token || !this.platformUserId) {
      return false
    }

    let content = JSON.stringify({
      'platformGameAccountId': accountId
    })

    const options = {
      hostname: 'spark.gameforge.com',
      path: '/api/v1/auth/thin/codes',
      port: 443,
      method: 'POST',
      headers: {
        'User-Agent': 'GameforgeClient/2.0.48',
        'TNT-Installation-Id': this.installationId,
        'Origin': 'spark://www.gameforge.com',
        'Authorization': 'Bearer ' + this.token,
        'Connection': 'Keep-Alive',
        'Content-Type': 'application/json',
        'Content-Length': content.length
      }
    }

    let data = await this.doRequest(options, content)

    if (!data.hasOwnProperty('code')) {
      return false
    }

    return this.convertToken(data.code)
  }

  convertToken (token) {
    let cToken = ''
    for (let i = 0; i < token.length; i++) {
      cToken += token.charCodeAt(i).toString(16)
    }
    return cToken
  }

  doRequest (options, data) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        res.setEncoding('utf8')
        let responseBody = ''

        res.on('data', (chunk) => {
          responseBody += chunk
        })

        res.on('end', () => {
          resolve(JSON.parse(responseBody))
        })
      })

      req.on('error', (err) => {
        reject(err)
      })

      if (data) {
        req.write(data)
      }
      req.end()
    })
  }
}

module.exports = NtLauncher
