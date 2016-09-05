var Promise = require('bluebird')

var Modely = require('../index')
var utils = require('./util')

/**
 * Deletes the model
 * ?@param {integer} model_id - id of the model to delete
 */
function deleteModel(modelId) {
  var Model = this  // Reference to the model
  var id = modelId
  return new Promise(function (resolve, reject) {
    Model._action = 'deleting'
    if (typeof id === 'undefined') {
      id = Model[Model._primary_key]
    }
    if (id === 'undefined') {
      reject(new Error('IdNotDefined'))
    }
    if (typeof Model[Model._primary_key] === 'undefined') {
      Model[Model._primary_key] = id
    }
    Model.$processPending(Model, 'Delete')
    return Modely.knex.transaction(function (trx) {
      Model._trx = trx
      return trx(Model._name)
      .where(Model._columns[Model._primary_key].name, id)
      .del()
      .then(function () {
        return utils.pendingTransactions(Model, 'Delete')
      })
      // .then(processRelationships)
      .catch(reject)
    }).then(function () {
      Model._action = null
      return resolve()
    })
    .catch(function (error) {
      Modely.log.error(error)
      return reject(error)
    }).finally(function () {
      Model._action = null
      return resolve()
    })
  })
}

module.exports = deleteModel
