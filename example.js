const co = require('co')
const Scheduler = require('./index.js')
const moment = require('moment')

var scheduler = new Scheduler({
  redis: { host: 'localhost', port: 6379 },
  handlers: {
    check: (data) => {
      console.log('scheduler1', data)
      console.log(moment().format())
    },
    job2: (data) => console.log('omg2')
  }
})

// var scheduler2 = new Scheduler({
//   // redis:{servers: [{host: '127.0.0.1', port: 6379}] },
//   redis: { host: 'localhost', port: 6379 },
//   handlers: {
//     check: (data) => {
//       console.log('scheduler2', data)
//     },
//     job2: (data) => console.log('omg2')
//   }
// })

scheduler.on('error', (e) => console.log('scheduler error', e.stack))

co(function * () {
  console.log(moment().format())
  var date = moment().add({seconds: 3}).toDate()
  yield scheduler.schedule({key: 'email-1235', handler: 'check', data: {foo: 'bar'}, delay: {seconds: 3}})
  yield scheduler.schedule({key: 'email-1236', handler: 'check', data: {foo: 'bar'}, at: date})

  // var retDel = yield scheduler.cancel('email-1235')
  // console.log(retDel)
})
.catch((e) => console.log(e.stack))
