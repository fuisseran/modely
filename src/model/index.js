var async = require('async')
var Promise = require('bluebird')
var $read = require('./read')
var $create = require('./create')
var $update = require('./update')
var $delete = require('./delete')
var $extend = require('./extend')
var $search = require('./search')
var $save = require('./save')
var $install = require('./install')
var Modely = require('../')
var basePropertyObject = {}
var baseProperties

function BaseModel() {
  var _this = this
  // Emit the OnInitialise event
  Modely.emit('Model:' + _this._name + ':OnInitialise', _this)
  // Define the base properties for the Model Object
  _this.$assignProperties(_this._columns)
  Object.defineProperty(_this, '_meta', {
    enumerable: true,
    value: {}
  })
  Object.defineProperties(_this, {
    _raw_properties: {
      enumerable: false,
      value: null
    }
  })
  _this.$assignParentProperties()
}


// Common functions for the model
/**
 * Create the properties for the Model.
 * @param {object} columns - columns to define
 */
function assignProperties(columns) {
  var Model = this
  Object.keys(columns).forEach(function (propertyName) {
    var columnDef = columns[propertyName]
    Object.defineProperty(Model, propertyName, {
      enumerable: true,       // Required for enumeraiton of the property
      configurable: true,
      get: function () {
        if (typeof Model._data.values[columnDef.name] === 'undefined') {
          return Model._data.original[columnDef.name]
        }
        return Model._data.values[columnDef.name]
      },
      set: function (val) {
        if (val !== Model._data.values[columnDef.name]) {
          Model._data.values[columnDef.name] = val
        }
      }
    })
  })
  // add _meta
  Object.defineProperty(Model, '_meta', {
    enumerable: true,       // Required for enumeraiton of the property
    configurable: true,
    get: function () {
      if (typeof Model._data.values._meta === 'undefined') {
        return Model._data.original._meta
      }
      return Model._data.values._meta
    }
  })
}

function processPending(action) {
  var Model = this
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

function mapModelProperties() {
  var columns = this._columns
  var values = this._data.values
  var dataObj = {}
  Object.keys(columns).forEach(function (columnKey) {
    var columnName = columns[columnKey].name
    if (typeof values[columnName] !== 'undefined') {
      dataObj[columnName] = values[columnName]
    }
  })
  this._data_object = dataObj
  return dataObj
}

function pendingTransactions(action) {
  var Model = this
  Modely.emit('Model:' + Model._name + ':On' + action, Model)
  if (Model._pending_transactions.length > 0) {
    return Promise.map(Model._pending_transactions, function (saveTransaction) {
      return saveTransaction
    })
  }
  return new Promise(function (resolve) { resolve() })
}

// Definiftions for the base model properties
baseProperties = [
  ['$create', $create],                          // Creates the model
  ['$read', $read],                              // Reads the model
  ['$update', $update],                          // Updates the model
  ['$delete', $delete],                          // Deletes the model
  ['$install', $install],                        // Installs the model
  ['$save', $save],                              // saves the model
  ['$extend', $extend],                          // Extends the model
  ['$assignProperties', assignProperties],       // Defines the propreties on the model
  ['$processPending', processPending],           // Processes Pending transaciton on the model
  ['$mapModelProperties', mapModelProperties],   // Creates and insert object for the database
  ['$pendingTransactions', pendingTransactions], // Executes ther pendign transactions on the model
  ['$search', $search]                           // Searchs the model
]

baseProperties.forEach(function (baseProperty) {
  basePropertyObject[baseProperty[0].toString()] = {
    enumerable: false,
    writeable: true,
    value: baseProperty[1]
  }
})

Object.defineProperties(BaseModel.prototype, basePropertyObject)

module.exports = function () {
  BaseModel.prototype.Modely = this
  return BaseModel
}
