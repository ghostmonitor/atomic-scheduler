'use strict'

const redis = require('redis')
const Promise = require('bluebird')
const classWrap = require('async-base-class').wrap
Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)
const events = require('events')

const moment = require('moment')
const _ = require('underscore')

class Scheduler extends events.EventEmitter {
  // Example
  // redis:{
  //   servers: [
  //     {
  //       host: '127.0.0.1',
  //       port: 6379
  //     }
  //   ]
  // },
  // handlers: {
  //   check: (data) => console.log('omg', data),
  //   job2: (data) => console.log('omg2')
  // }
  constructor (obj) {
    super()
    this.handlers = obj.handlers

    this.redisListener = redis.createClient(obj.redis)
    this.redisPublisher = redis.createClient(obj.redis)
    this.db = obj.db || 0
    this.prefixes = {key: 'atomic-schedudler:key:', data: 'atomic-schedudler:data:', lock: 'atomic-schedudler:lock:'}
    this.isLockEnabled = true

    this._setEventListener()
  }

  _setEventListener () {
    this.redisListener.on('message', (channel, key) => {
      key = key.replace(this.prefixes.key, '')
      this.handleExpire(key)
      .catch((err) => {
        var msg = `Scheduler error occured while running handler for key ${key}: ${err.message}`
        err.message = msg
        this.emit('error', err)
      })
    })

    this.redisListener.subscribe('__keyevent@' + this.db + '__:expired', (err) => this.emit(err))
  }

  * handleExpireAsync (key) {
    var data = yield this.redisPublisher.hgetallAsync(`${this.prefixes.data}${key}`)
    if (this.isLockEnabled) {
      var locked = yield this.redisPublisher.getsetAsync(`${this.prefixes.lock}${key}`, 1)
      if (locked) return
    }
    this.handlers[data.handler](JSON.parse(data.data))

    // Clean it up
    // We do this because some listeneres might get the event later
    yield this.redisPublisher.expireAsync(`${this.prefixes.lock}${key}`, 60)
    yield this.redisPublisher.delAsync(`${this.prefixes.data}${key}`)
  }
  /**
   * [schedule description]
   * @param  {object} obj [description]
   * @param  {string} obj.key [description]
   * @param  {string} obj.handler [description]
   * @param  {object} obj.data [description]
   * @param  {[Date]} obj.at [description]
   * @param  {[object]} obj.delay [description]
   * @return {[type]}     [description]
   */
  * scheduleAsync (obj) {
    if (!obj.key) throw new Error('Schedule key is missing!')
    if (!obj.handler) throw new Error('Schedule handler is missing!')
    if (!obj.data) throw new Error('Schedule data is missing!')
    if (!(obj.at || obj.delay)) throw new Error('Schedule delay or at is missing!')

    var keyName = `${this.prefixes.key}${obj.key}`
    var isNewKey = yield this.redisPublisher.setnxAsync(keyName, 1)
    if (!isNewKey) throw new Error(`Schedule key '${obj.key}' is already exists!`)

    var expireAt = obj.at ? moment(obj.at).unix() : moment().add(obj.delay).unix()
    yield this.redisPublisher.expireatAsync(keyName, expireAt)

    var hmsetKeyName = `${this.prefixes.data}${obj.key}`
    var hmsetData = {
      handler: obj.handler,
      data: JSON.stringify(obj.data)
    }
    hmsetData = _(hmsetData).chain().pairs().flatten().value()
    yield this.redisPublisher.hmsetAsync(hmsetKeyName, hmsetData)
    return moment.unix(expireAt).toDate()
  }

  /**
   * [cancelAsync description]
   * @param  {mixed} obj object kontains key param or string with the key itself
   * @return {bool} Returns weather if the delete was successful
   */
  * cancelAsync (obj) {
    if (_(obj).isString()) obj = {key: obj}
    var key = obj.key
    var ret = yield Promise.all([
      this.redisPublisher.delAsync(`${this.prefixes.key}${key}`),
      this.redisPublisher.delAsync(`${this.prefixes.data}${key}`)
    ])

    return !!(ret[0] && ret[1])
  }

  clean () {
    this.redisListener.unsubscribe('__keyevent@' + this.db + '__:expired')
    this.handlers = {}
  }

}

module.exports = classWrap(Scheduler)
