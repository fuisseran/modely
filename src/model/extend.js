var Promise = require('bluebird')
var common = require('../common')
var parsers = require('../parsers')
var Modely = require('../')

// This should call the save on the parent class then and pass it's save as a transaction
// to the parent save.
module.exports = function (className, properties) {
  var ParentModel = this
  var ParentName = ParentModel._name
  // this needs to be similar to the register
  // Check the properties to ensure that they are valid.
  // Merge processed properties with the current models properties.
  // Register the new Model with Modely
  return new Promise(function (resolve, reject) {
    var primaryColumn
    if (typeof Modely.models[className] !== 'undefined') {
      return reject('DuplicateClass')
    }
    className = name.toLowerCase().replace(/[^\w\s]/g, '_')
    // check if there is a refernce to the parent model in the popreties columns
    if (typeof properties.columns[ParentName + '_' + ParentModel._primary_key] === 'undefined') {
      // add reference to the parent primary key
      primaryColumn = ParentModel._columns[ParentModel[ParentModel._primary_key]]
      properties.columns[ParentName + '_' + primaryColumn.anme] = {
        name: className + '_' + primaryColumn.name,
        full_name: className + '.' + className + '_' + primaryColumn.name,
        table: className,
        type: primaryColumn.type,
        size: primaryColumn.size
      }
    }
    if (typeof this.class === 'undefined') {
      Modely.models[ParentName].prototype._columns.class = {
        type: 'string',
        size: 30,
        name: ParentName + '_class',
        full_name: className + '.' + className + '_class',
        table: className
      }
    }
    Modely.models[className] = function (user) {
      common.apply_core_properties(this, name, properties)
      this.$user = user
      this.super_()
    }
    // Set the model name
    Object.defineProperty(Modely.models[ParentName].prototype, '_name', {
      enumerable: false,
      writable: false,
      configurable: false,
      value: className
    })
    Object.defineProperty(Modely.models[ParentName].prototype, '_parent_model', {
      enumerable: false,
      writable: false,
      configurable: false,
      value: ParentName
    })
    Object.defineProperty()
    parsers.columns(Modely.models[name], properties.columns)
  })
}
