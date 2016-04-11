/// <reference path="../typings/tsd.d.ts" />

// include required npm modules
var fs = require('fs')
var knex_lib = require('knex')
var Promise = require('bluebird')
var EventEmitter = require('eventemitter2').EventEmitter2
var async = require('async')
var util = require('util')
//Map the EventEmitter Functions
var ee = new EventEmitter({
  wildcard: true,
  delimiter: ':'
})
for (var key in ee) {
  Modely[key] = ee[key]
}

// Export Modely early to voide any circular require issues
module.exports = Modely

// Internal modules
var Log = require('./logger')
var model_collection = {}
var log_methods = ['info', 'error', 'warn', 'debug']
var $BaseModel = require('./model')
var Register = require('./register')
var parseRelationships = require('./relationships')(Modely)
var knex

function Modely(connection_string, logger) {
  if (connection_string) {
    get_databse_connection(connection_string, Modely)
  }
  if (logger) {
    this.log = logger
  } else {
    this.log = Log
  }
  return Modely
}


Object.defineProperties(Modely, {
  models: {
    get: function() {
      return model_collection
    }
  },
  BaseModel: {
    value: $BaseModel
  },
  knex: {
    get: function() {
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
    get: function() {
      return Log
    }
  },
  initialise: {
    value: function initialise() {
      var models = this.models

      return new Promise(function(resolve, reject) {
        parseRelationships().then(function() {  
          async.each(
            models,
            function iterator(model, callback) {
              var instance = model();
              instance.$install().then(function() {
                callback(null)
              })
            },
            function done(err, results) {
              return resolve()
            }
          )
          return null
          })
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
function check_logger(logger) {
  return log_methods.map(function(log_method) {
    if (typeof logger[log_method] !== 'function') {
      return log_method
    }
  })
}

/**
* Gets the knex instance based on the connection string
* @param {object} connection_string
* @returns {knex} knex
*/
function get_databse_connection(connection_string, instance) {
  knex = knex_lib(connection_string)
  instance.knex_initialised = true
}

function loadExtensions() {
  var rx = /\.js$/
  fs.readdirSync(__dirname + '/extensions').forEach(function(modely_ext) {
    if (rx.exec(modely_ext))
      require('./extensions/' + modely_ext.replace(rx, ''))(Modely)
  })
}

