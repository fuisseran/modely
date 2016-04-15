var async = require('async')
var Promise = require('bluebird')
var Modely = require('../')

function toMySqlDate(dateObj) {
  return dateObj.toISOString().slice(0, 19).replace('T', ' ')
}

function checkProperties(properties) {
  // Check there is a version supplied
  if (!properties.version) {
    throw new Error('NoVersion')
  }
  // Check for a columns property
  if (!properties.columns) {
    throw new Error('NoColumns')
  }
}

function defineProperties(Model, columns) {
  Object.keys(columns).forEach(function (propertyName) {
    var columnDef = columns[propertyName]
    Object.defineProperty(Model, propertyName, {
      enumerable: true,       // Required for enumeraiton of the property
      configurable: true,
      get: function () {
        return Model._data.values[columnDef.name]
      },
      set: function (val) {
        if (val !== Model._data.values[columnDef.name]) {
          Model._data.values[columnDef.name] = val
        }
      }
    })
  })
}

function processPending(Model, action) {
  Modely.emit('Model:' + Model._name + ':Before' + action, Model)
  return new Promise(function (resolve, reject) {
    async.each(Model._pending,
      function pendingIterator(item, callback) {
        item.then(function (err, result) {
          callback(err, result)
        })
      },
      function pendingDone(err, results) {
        Model._pending = []
        if (err) {
          return reject(err)
        }
        return resolve(results)
      }
    )
  })
}

function pendingTransactions(Model, action) {
  Modely.emit('Model:' + Model._name + ':On' + action, Model)
  if (Model._pending_transactions.length > 0) {
    return Promise.map(Model._pending_transactions, function (saveTransaction) {
      return saveTransaction
    })
  }
  return new Promise(function (resolve) { resolve() })
}

function setAuditModified(Model, insertObject) {
  var prefix = Model._name + '_'
  insertObject[prefix + 'modified_by'] = Model.$user.id
  insertObject[prefix + 'modified_on'] = (new Date()).toISOString().slice(0, 19).replace('T', ' ')
}

function setAuditCreated(Model, insertObject) {
  var prefix = Model._name + '_'
  insertObject[prefix + 'created_by'] = Model.$user.id
  insertObject[prefix + 'created_on'] = (new Date()).toISOString().slice(0, 19).replace('T', ' ')
}

function mapModelProperties(Model) {
  var columns = Model._columns
  var values = Model._data.values
  var insertObj = {}
  Object.keys(columns).forEach(function (columnKey) {
    var columnName = columns[columnKey].name
    if (typeof values[columnName] !== 'undefined') {
      insertObj[columnName] = values[columnName]
    }
  })
  return insertObj
}

module.exports = {
  toMySqlDate: toMySqlDate,
  defineProperties: defineProperties,
  checkProperties: checkProperties,
  processPending: processPending,
  pendingTransactions: pendingTransactions,
  mapModelProperties: mapModelProperties,
  setAuditModified: setAuditModified,
  setAuditCreated: setAuditCreated
}
