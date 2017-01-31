var Promise = require('bluebird')
var utils = require('./util')
var parsers = require('../parsers')
var Modely = require('../')

/**
 * Check if the model is loaded
 * @param {BaseModel} Model - the model instance to check
 */
function checkModelIsLoaded(Model) {
  return new Promise((resolve, reject) => {
    if (Model._status !== 'loaded') {
      Model.$read(Model[Model._primary_key])
      .then(() => { return resolve() })
      .catch(() => { reject(new Error('UnableToLoadModel')) })
    } else {
      return resolve()
    }
  })
}

function executeUpdateTransaction(model) {
  return model._trx(model._name)
    .update(model._trxData)
    .into(model._name)
    .where(model._columns[model._primary_key].name, model[model._primary_key])
    .then(() => {
      return utils.pendingTransactions(model, 'Save')
    })
}

module.exports = function update(properties, options) {
  var Model = this
  utils.parseOptions(Model, options)
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
      Modely.emit('Model:' + Model._name + ':BeforePropertyRead', Model)
      Model._trxData = Model.$mapModelProperties(Model)
      Model._status = 'update' // need to check which one to keep
      Model._action = 'update'
      // Remove the primary key from the update Object.
      delete Model._trxData[Model._columns[Model._primary_key].name]
      // validate here
      if (Object.keys(Model._trxData).length === 0) {
        if (Model._trx) {
          return Model.$processPending(Model, 'Save')
          .then(() => utils.pendingTransactions(Model, 'PreSaveTransaction'))
          .then(() => utils.pendingTransactions(Model, 'Save'))
          .then(() => resolve())
          .catch((error) => reject(error))
        }
        return Modely.knex.transaction(trx =>
          Model.$processPending(Model, 'Save')
          .then(() => utils.pendingTransactions(Model, 'PreSaveTransaction'))
          .then(() => utils.pendingTransactions(Model, 'Save'))
          .then(trx.commit)
          .then(() => resolve(Model))
          .catch((error) => {
            trx.rollback()
            return reject(error)
          })
        )
      }
      return Model.$processPending(Model, 'Save').then(function (/* pendingResults*/) {
        if (Model._trx) {
          return utils.pendingTransactions(Model, 'PreSaveTransaction')
          .then(function () {
            return executeUpdateTransaction(Model).then(resolve)
          })
        }
        return Modely.knex.transaction(function (trx) {
          Model._trx = trx
          return utils.pendingTransactions(Model, 'PreSaveTransaction')
            .then(() => { return executeUpdateTransaction(Model) })
            .then(() => { 
              return utils.pendingTransactions(Model, 'Save')
            })
            .then(trx.commit)
            .catch(error => {
              Modely.log.error(error)
              trx.rollback()
              return reject(error)
            })
        }).then(function () {
          Model._pending_transactions = []
            // Reload model
          Model.$read(Model[Model._primary_key])
            .then(() => { resolve(Model) })
            .catch(error => { reject(error) })
        })
      })
    }).catch(error => {
      Modely.log.error(error)
      reject(error)
    })
  })
}
