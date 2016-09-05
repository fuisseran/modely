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

function executeUpdateTransaction(model) {
  return model._trx(model._name)
    .update(model._trxData)
    .into(model._name)
    .where(model._columns[model._primary_key].name, model[model._primary_key])
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
      if (properties) {
        parsers.properties(Model, properties)
      }
      Modely.emit('Model:' + Model._name + 'BeforePropertyRead', Model)
      Model._trxData = Model.$mapModelProperties(Model)
      Model._status = 'update' // need to check which one to keep
      Model._action = 'update'
      // Remove the primary key from the update Object.
      delete Model._trxData[Model._columns[Model._primary_key].name]
      // validate here
      if (Object.keys(Model._trxData).length === 0) {
        return resolve()
      }
      return Model.$processPending('Save').then(function (/* pendingResults*/) {
        return Modely.knex.transaction(function (trx) {
          Model._trx = trx
          return utils.pendingTransactions(Model, 'PreSaveTransaction')
          .then(function () {
            return executeUpdateTransaction(Model)
          })
          .then(function (/* insertResponse */) {
            return utils.pendingTransactions(Model, 'Save')
          })
          .catch(function (error) {
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
