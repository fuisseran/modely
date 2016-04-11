var async = require('async')
var Promise = require('bluebird')
var Modely = require('../')

module.exports = {
  toMySqlDate : toMySqlDate,
  defineProperties : defineProperties,
  checkProperties : checkProperties,
  processPending :processPending,
  pendingTransactions : pendingTransactions,
  mapModelProperties : mapModelProperties,
  setAuditModified :setAuditModified,
  setAuditCreated :setAuditCreated
}

function toMySqlDate(date_obj) {
  return date_obj.toISOString().slice(0, 19).replace('T', ' ')
}

function checkProperties(properties){
  // Check there is a version supplied
  if(!properties.version){
    throw new Error('NoVersion')
  }
  // Check for a columns property
  if(!properties.columns){
    throw new Error('NoColumns')
  }
}

function defineProperties(Model, columns) {
  Object.keys(columns).forEach(function (property_name) {
    var column_def = columns[property_name]
    Object.defineProperty(Model, property_name, {
      enumerable: true,       // Required for enumeraiton of the property
      configurable: true,
      get: function () {
        return Model._data.values[column_def.name];
      },
      set: function (val) {
        if (val != Model._data.values[column_def.name]) {
            Model._data.values[column_def.name] = val
        }
      }
    })
  }) 
}

function processPending(Model, action){
  Modely.emit('Model:' + Model._name + ':Before' + action, Model)
  return new Promise(function(resolve, reject){
    async.each(Model._pending,
      function pending_iterator(item, callback) {
        item.then(function (err, result) {
          callback(err, result)
        })
      },
      function pending_done(err, results) {
        Model._pending = []
        if (err) { 
          return reject(err)
        }
        return resolve(results)
      }
    )
  })
}

function pendingTransactions(Model, action){
  Modely.emit('Model:' + Model._name + ':On' + action, Model)
  if (Model._pending_transactions.length > 0) {
    return Promise.map(Model._pending_transactions, function (save_transaction) {
      return save_transaction
    })
  } else {
    return new Promise(function (resolve, reject) { resolve() })
  }
}

function setAuditModified(Model, insert_object){
  var prefix = Model._name + '_'
  insert_object[prefix + 'modified_by'] = Model.$user.id
  insert_object[prefix + 'modified_on'] = (new Date()).toISOString().slice(0, 19).replace('T', ' ')
}

function setAuditCreated(Model, insert_object){
  var prefix = Model._name + '_'
  insert_object[prefix + 'created_by'] = Model.$user.id
  insert_object[prefix + 'created_on'] = (new Date()).toISOString().slice(0, 19).replace('T', ' ')
}

function mapModelProperties(Model){
  var columns = Model._columns
  var values = Model._data.values
  var insert_obj = {}
  Object.keys(columns).forEach(function (column_key, index, _array) {
    var column_name = columns[column_key].name
    if (typeof values[column_name] !== 'undefined') {
      insert_obj[column_name] = values[column_name]
    }
  })
  return insert_obj
}