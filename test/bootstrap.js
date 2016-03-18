'use strict'

global.co = require('co')
global.Promise = require('bluebird')
global.Wrapper = require('../index')
global.chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
global.chai.use(chaiAsPromised)
global.should = global.chai.should()
global.expect = global.chai.expect

// const _ = require('underscore')
require('co-mocha')
