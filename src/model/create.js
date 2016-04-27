var Promise = require('bluebird')

var Modely = require('../index')
var utils = require('./util')
var parsers = require('../parsers')

module.exports = function createModel(properties) {
  var Model = this
  // Return promise
  return new Promise(function (resolve, reject) {
    var dataObject
    Model._action = 'create'
    if (properties) {
      parsers.properties(Model, properties)
      if (typeof Model[Model._primary_key] !== 'undefined') {
        // Check if an id has been assigned, if it has reject the create
        return reject(new Error('InvalidPropertySupplied'))
      }
    }
    dataObject = Model.$mapModelProperties(Model)
    if (Model._columns[Model._primary_key].auto) {
      delete dataObject[Model._columns[Model._primary_key].name]
    }
    // Check if the Model is audited and apply audit information
    if (Model._schema.audit) {
      if (typeof Model.$user !== 'undefined' && Model.$user !== null) {
        utils.setAuditCreated(Model, dataObject)
        utils.setAuditModified(Model, dataObject)
      } else {
        Model._action = null
        return reject(new Error('UserRequired'))
      }
    }
    // Copy ._meta to ._data.values._meta
    Model._data.values._meta = Model._meta
    // Process any changes to be made to the object before transactions begin.
    return Model.$processPending(Model, 'Save').then(function () {
      // validate mdoel here
      return Modely.knex.transaction(function (trx) {
        Model._trx = trx
        return trx(Model._name)
          .insert(dataObject, Model._columns[Model._primary_key].name)
          .then(function (insertResponse) {
            Model[Model._primary_key] = insertResponse[0]
            return utils.pendingTransactions(Model, 'Save')
          }).catch(function (err) {
            return reject(err)
          })
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
