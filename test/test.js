'use strict'
/* global describe, it, expect */

const moment = require('moment')
const Scheduler = require('../index')
const Promise = require('bluebird')

const redis = require('redis')
Promise.promisifyAll(redis.RedisClient.prototype)
Promise.promisifyAll(redis.Multi.prototype)

const redisHost = process.env.REDIS_PORT_6379_TCP_ADDR || 'localhost'
const redisObj = { host: redisHost, port: 6379 }

var scheduler1
var handler1 = function () {}

describe('#constructor', function () {
  it('should flush redis db', function * () {
    yield Promise.delay(5 * 1000)
    const redisClient = redis.createClient(redisObj)
    return redisClient.flushdbAsync()
  })

  it('should create a scheduler', function () {
    scheduler1 = new Scheduler({
      redis: redisObj,
      handlers: {
        handler1: handler1,
        job2: (data) => console.log('omg2')
      }
    })
  })

  it('should work with delay', function * () {
    var calledAt
    var data
    scheduler1.handlers.handler1 = (_data) => {
      calledAt = moment()
      data = _data
    }
    var timestamp = yield scheduler1.schedule({key: 'email-1235', handler: 'handler1', data: {foo: 'bar'}, delay: {seconds: 2}})
    yield Promise.delay(2200)
    expect(calledAt.unix()).to.be.equal(timestamp)
    expect(data).to.be.eql({foo: 'bar'})
  })

  it('should work with at', function * () {
    var calledAt
    scheduler1.handlers.handler1 = (data) => { calledAt = moment() }
    var timestamp = yield scheduler1.schedule({key: 'email-1235', handler: 'handler1', data: {foo: 'bar'}, at: moment().add(2, 'seconds').toDate()})
    yield Promise.delay(2200)
    expect(calledAt.unix()).to.be.equal(timestamp)
  })

  it('should clean', function * () {
    var calledAt
    scheduler1.handlers.handler1 = (data) => { calledAt = moment() }
    yield scheduler1.schedule({key: 'email-1235', handler: 'handler1', data: {foo: 'bar'}, delay: {seconds: 1}})
    scheduler1.clean()
    yield Promise.delay(1100)
    expect(calledAt).to.be.equal(undefined)
  })

  it('should work if restarted', function * () {
    var calledAt
    scheduler1.handlers.handler1 = (data) => { calledAt = moment() }
    var timestamp = yield scheduler1.schedule({key: 'email-1235', handler: 'handler1', data: {foo: 'bar'}, delay: {seconds: 1}})
    scheduler1.clean()
    scheduler1 = new Scheduler({
      redis: redisObj,
      handlers: {
        handler1: (data) => { calledAt = moment() }
      }
    })
    yield Promise.delay(1100)
    expect(calledAt.unix()).to.be.equal(timestamp)
  })

  it('should be atomic', function * () {
    var callCount = 0
    scheduler1.handlers.handler1 = (data) => callCount++
    yield scheduler1.schedule({key: 'email-1235', handler: 'handler1', data: {foo: 'bar'}, delay: {seconds: 1}})
    var scheduler2 = new Scheduler({
      redis: redisObj,
      handlers: {
        handler1: (data) => (data) => callCount++
      }
    })
    var scheduler3 = new Scheduler({
      redis: redisObj,
      handlers: {
        handler1: (data) => (data) => callCount++
      }
    })

    yield Promise.delay(1100)
    expect(callCount).to.be.equal(1)

    scheduler2.clean()
    scheduler3.clean()
  })
})
