// <reference path="../typings/tsd.d.ts" />

// include required npm modules
var fs = require('fs')
var knexLib = require('knex')
var Promise = require('bluebird')
var EventEmitter = require('eventemitter2').EventEmitter2
var async = require('async')
// Map the EventEmitter Functions
var ee = new EventEmitter({
  wildcard: true,
  delimiter: ':'
})
// Internal modules
var Log = require('./logger')
var modelCollection = {}
// var logMethods = ['info', 'error', 'warn', 'debug']
var $BaseModel
// var Register
var knex
var key
var initialised = false
/**
* Gets the knex instance based on the connection string
* @param {object} connection_string
* @returns {knex} knex
*/
function getDatabaseConnection(connectionString, instance) {
  if (typeof connectionString.__knex__ === 'undefined') {
    knex = knexLib(connectionString)
  } else {
    knex = connectionString
  }
  instance.connection_initialised = true
}

function Modely(connectionString, logger) {
  if (connectionString) {
    getDatabaseConnection(connectionString, Modely)
    Modely.processQueue()
  }
  if (logger) {
    Modely.log = logger
  } else {
    Modely.log = Log
  }
  return Modely
}

function loadExtensions() {
  var rx = /\.js$/
  fs.readdirSync(__dirname + '/extensions').forEach(function (modelyExt) {
    if (rx.exec(modelyExt)) {
      require('./extensions/' + modelyExt.replace(rx, ''))(Modely)
    }
  })
}

// Export Modely early to voide any circular require issues
for (key in ee) {
  Modely[key] = ee[key]
}
Object.defineProperties(Modely, {
  connection_initialised: {
    enumerable: true,
    get: function () {
      return initialised
    },
    set: function (val) {
      initialised = val
    }
  },
  queue: {
    enumerable: true,
    value: []
  }
})
module.exports = Modely
// Import requires
$BaseModel = require('./model')
Object.defineProperties(Modely, {
  models: {
    get: function () {
      return modelCollection
    }
  },
  BaseModel: {
    value: $BaseModel
  },
  knex: {
    get: function () {
      return knex
    }
  },
  relationships: {
    value: {}
  },
  register: {
    value: require('./register')
  },
  log: {
    enumerable: true,
    get: function () {
      return Log
    }
  },
  processQueue: {
    value: function processQueue() {
      var self = this
      self.queue.forEach(function (queueItem) {
        var modelInstance = new self.models[queueItem.model]()
        modelInstance[queueItem.fn](queueItem.args)
      })
    }
  }
})
Object.defineProperty(Modely, 'relationshipsManager', {
  value: require('./relationships')(Modely)
})
loadExtensions()
/**
* Checks if the supplied logger has the required log methods
* @param {object} logger
* @retuns {array} missing
*/
/*
function checkLogger(logger) {
  return logMethods.map(function (logMethod) {
    if (typeof logger[logMethod] !== 'function') {
      return logMethod
    }
    return null
  })
}
*/
