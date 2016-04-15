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
var Register = require('./register')
var parseRelationships
var knex
var key
/**
* Gets the knex instance based on the connection string
* @param {object} connection_string
* @returns {knex} knex
*/
function getDatabaseConnection(connectionString, instance) {
  knex = knexLib(connectionString)
  instance.knex_initialised = true
}

function Modely(connectionString, logger) {
  if (connectionString) {
    getDatabaseConnection(connectionString, Modely)
  }
  if (logger) {
    this.log = logger
  } else {
    this.log = Log
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

module.exports = Modely
// Import requires
$BaseModel = require('./model')
parseRelationships = require('./relationships')
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
  register: {
    value: Register
  },
  relationships: {
    value: {}
  },
  log: {
    enumerable: true,
    get: function () {
      return Log
    }
  },
  initialise: {
    value: function initialise() {
      var models = this.models
      return new Promise(function (resolve, reject) {
        parseRelationships().then(function () {
          async.each(
            models,
            function iterator(model, callback) {
              var instance = model()
              instance.$install().then(function () {
                callback(null)
              })
            },
            function done(err, results) {
              return resolve(results)
            }
          )
          return null
        }).catch(reject)
      })
    }
  }
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
