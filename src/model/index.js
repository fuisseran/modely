var async = require('async')
var utils = require('./util')
var $create = require('./create')
var $read = require('./read')
var $update = require('./update')
var $delete = require('./delete')
var $install = require('./install')
var $save = require('./save')
var $extend = require('./extend')
var parsers = require('../parsers')
var Modely = require('../')

function BaseModel() {
  var _this = this
  // Emit the OnInitialise event
  Modely.emit('Model:' + _this._name + ':OnInitialise', _this)
  
  // Define the base properties for the Model Object
  _this.$assignProperties(_this._columns)
  Object.defineProperty(_this, '_meta',{
    enumerable: true,
    value : {}
  })
  Object.defineProperties(_this, {
    _raw_properties : {
      enumerable:false,
      value:null
    }
  })
  //_this.$assignParentProperties()
  // If the model is auditied assign the audit properties
  if (typeof _this._audit !== 'undefined' && _this._audit !== null) {
    _this.$assignProperties(_this._audit)
  }
}
module.exports = BaseModel

// Common functions for the model
/**
 * Create the properties for the Model.
 * @param {object} columns - columns to define 
 */
function assignProperties(columns) {
  var Model = this
  Object.keys(columns).forEach(function (property_name) {
    var column_def = columns[property_name]
    Object.defineProperty(Model, property_name, {
      enumerable: true,       // Required for enumeraiton of the property
      configurable: true,
      get: function () {
        if(typeof Model._data.values[column_def.name] === 'undefined'){
          return Model._data.original[column_def.name]
        } else {
          return Model._data.values[column_def.name]
        }
      },
      set: function (val) {
        if (val != Model._data.values[column_def.name]) {
          Model._data.values[column_def.name] = val
        }
      }
    })
  })
  // add _meta
  Object.defineProperty(Model, '_meta', {
    enumerable: true,       // Required for enumeraiton of the property
    configurable: true,
    get: function () {
      if(typeof Model._data.values._meta === 'undefined'){
        return Model._data.original._meta
      } else {
        return Model._data.values._meta
      }
    },
  })
}

function processPending(action){
  var Model = this
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

function mapModelProperties(){
  var columns = this._columns
  var values = this._data.values
  var data_obj = {}
  Object.keys(columns).forEach(function (column_key, index, _array) {
    var column_name = columns[column_key].name
    if (typeof values[column_name] !== 'undefined') {
      data_obj[column_name] = values[column_name]
    }
  })
  this._data_object = data_obj
  return data_obj
  
}

function pendingTransactions(action){
  var Model = this
  Modely.emit('Model:' + Model._name + ':On' + action, Model)
  if (Model._pending_transactions.length > 0) {
    return Promise.map(Model._pending_transactions, function (save_transaction) {
      return save_transaction
    })
  } else {
    return new Promise(function (resolve, reject) { resolve() })
  }
}

// Definiftions for the base model properties
var base_properties = [
  ['$create', $create],                         // Creates the model
  ['$read', $read],                             // Reads the model
  ['$update', $update],                         // Updates the model
  ['$delete', $delete],                         // Deletes the model
  ['$install', $install],                       // Installs the model
  ['$extend', $extend],                         // Extends the model
  ['$assignProperties', assignProperties],      // Defines the propreties on the model
  ['$processPending', processPending],          // Processes Pending transaciton on the model
  ['$mapModelProperties', mapModelProperties],  // Creates and insert object for the database
  ['$pendingTransactions', pendingTransactions] // Executes ther pendign transactions on the model
]

// Base properties
var base_property_object = {}



base_properties.forEach(function (base_property, index, _array) {
  base_property_object[base_property[0].toString()] = {
    enumerable: false,
    writeable: true,
    value: base_property[1]
  }
})

Object.defineProperties(BaseModel.prototype, base_property_object)


