var Promise = require('bluebird')

var Modely = require('../index')
var utils = require('./util')
var parsers = require('../parsers')

function executeTransaction(model) {
  return model._trx(model._name)
  .insert(model._trxData, model._columns[model._primary_key].name)
  .then(function (insertResponse) {
    model[model._primary_key] = insertResponse[0]
    return utils.pendingTransactions(model, 'Save')
  })
}

module.exports = function createModel(properties, options) {
  var Model = this
  utils.parseOptions(Model, options)
  // Return promise
  return new Promise(function (resolve, reject) {
    Model._action = 'create'
    if (properties) {
      parsers.properties(Model, properties)
      if (typeof Model[Model._primary_key] !== 'undefined') {
        // Check if an id has been assigned, if it has reject the create
        return reject(new Error('InvalidPropertySupplied'))
      }
    }
    // Emit the BeforeModelRead event
    Modely.emit('Model:' + Model._name + 'BeforePropertyRead', Model)
    // Map the current data onto the data object
    Model._trxData = Model.$mapModelProperties(Model)
    // Remove the primary key if it is auto generated
    if (Model._columns[Model._primary_key].auto) {
      delete Model._trxData[Model._columns[Model._primary_key].name]
    }
    // Copy ._meta to ._data.values._meta
    Model._data.values._meta = Model._meta
    // Process any changes to be made to the object before transactions begin.
    return Model.$processPending(Model, 'Save').then(function () {
      // validate mdoel here
      return Modely.knex.transaction(function (trx) {
        Model._trx = trx
        return executeTransaction(Model, reject).catch(reject)
      }).then(function () {
        // Clear _pending_transations property
        Model._pending_transactions = []
        // Reload the model to get the meta data then resolve passing the Model back as the result
        return Model.$read(Model.id).then(function () {
          Model._action = null
          return resolve(Model)
        }).catch(function (error) {
          Model._action = null
          return reject(error)
        })
      })
    })
  })
}
