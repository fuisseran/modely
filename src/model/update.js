var async = require('async')
var Promise = require('bluebird')

var utils = require('./util')
var parsers = require('../parsers')


/**
 * Check if the model is loaded
 * @param {BaseModel} Model - the model instance to check 
 */
function check_model_is_loaded(Model){
  return new Promise(function(resolve, reject){
    if(Model._status !== 'loaded'){
      Model.$read(Model[Model._primary_key]).then(resolve).catch(function(error){
        reject(new Error('UnableToLoadModel'))
      })
    } else {
      resolve()
    }
  })
}

module.exports = function update(properties){
  var Model = this
  return new Promise(function(resolve,reject){
    if (properties) {
      parsers.properties(Model, properties)
      if(Model[Model._primary_key] === 'undefined'){
        // Check if an id has been assigned, ifi t hasn't reject the model
        reject(new Error('NoIdSupplied'))
      }
    }
    Model._status = 'updating'
    // Copy ._meta to ._data.values._meta
    Model._data.values._meta = Model._meta
    // Check the model is loaded before calling the update
    check_model_is_loaded(Model).then(function(){
      var data_object = Model.$mapModelProperties(Model)
      // Check if the Model is audited and apply audit information
      if (Model._schema.audit && typeof Model.$user !== 'undefined' && Model.$user !== null) {
        utils.setAuditModified(Model, data_object)
      } else {
        return reject(new Error('UserRequired'))
      }
      
      // Remove the primary key from the update Object.
      delete data_object[Model._columns[Model._primary_key].name]
      // validate here
      return Model.$processPending('Save').then(function(pending_results){
      return Modely.knex.transaction(function (trx) {
        Model._trx = trx
        return trx(Model._name)
          .update(data_object)
          .into(Model._name)
          .where(Model._columns[Model._primary_key].name, Model[Model._primary_key])
          .then(function (insert_response) {
            return utils.pendingTransactions(Model, 'Save')
          })
          .then(function(update_response){
            // Clear _pending_transations property
            Model._pending_transactions = []
            // Reload model
            Model.$read(Model[Model._primary_key]).then(function(){
              resolve(Model)
            }).catch(function(error){
              reject(error)
            })
          }).catch(function(error){
            Modely.log.error(error)
          })
        })
          })
    }).then(resolve).catch(function(error){
      Model.log.error(error)
      reject(error)
    })
  })
  
}
var Modely = require('../')