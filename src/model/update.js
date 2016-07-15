var Promise = require('bluebird')
var utils = require('./util')
var parsers = require('../parsers')
var Modely = require('../')

/**
 * Check if the model is loaded
 * @param {BaseModel} Model - the model instance to check
 */
function checkModelIsLoaded(Model) {
  return new Promise(function (resolve, reject) {
    if (Model._status !== 'loaded') {
      Model.$read(Model[Model._primary_key]).then(resolve).catch(function () {
        reject(new Error('UnableToLoadModel'))
      })
    } else {
      resolve()
    }
  })
}

module.exports = function update(properties) {
  var Model = this
  return new Promise(function (resolve, reject) {
    // Check if the model has a primary key if nto check the properties for one
    if (typeof properties !== 'undefined' && properties[Model._primary_key] !== 'undefined') {
      Model[Model._primary_key] = properties[Model._primary_key]
    }
    // Check the model is loaded before calling the update
    if (Model[Model._primary_key] === 'undefined') {
      return reject(new Error('NoIdSupplied'))
    }
    checkModelIsLoaded(Model).then(function () {
      var dataObject
      if (properties) {
        parsers.properties(Model, properties)
      }
      // Copy ._meta to ._data.values._meta
      Model._data.values._meta = Model._meta
      Modely.emit('Model:' + Model._name + 'BeforePropertyRead', Model)
      dataObject = Model.$mapModelProperties(Model)
      Model._status = 'update'
      // Remove the primary key from the update Object.
      delete dataObject[Model._columns[Model._primary_key].name]
      // validate here
      if (Object.keys(dataObject).length === 0) {
        return resolve()
      }
      return Model.$processPending('Save').then(function (/* pendingResults*/) {
        return Modely.knex.transaction(function (trx) {
          Model._trx = trx
          return trx(Model._name)
          .update(dataObject)
          .into(Model._name)
          .where(Model._columns[Model._primary_key].name, Model[Model._primary_key])
          .then(function (/* insertResponse */) {
            return utils.pendingTransactions(Model, 'Save')
          }).catch(function (error) {
            reject(error)
          })
          .catch(function (error) {
            Modely.log.error(error)
          })
        }).then(function () {
          Model._pending_transactions = []
            // Reload model
          Model.$read(Model[Model._primary_key]).then(function () {
            resolve(Model)
          }).catch(function (error) {
            reject(error)
          })
        })
      })
    }).catch(function (error) {
      Model.log.error(error)
      reject(error)
    })
  })
}
