var Promise = require('bluebird')

var Modely = require('../index')
var utils = require('./util')

module.exports = delete_model 

/**
 * Deletes the model
 * ?@param {integer} model_id - id of hte model to delete
 */
function delete_model(model_id){
  var Model = this
  var id = model_id
  return new Promise(function(resolve, reject){
    Model._action = 'deleting'  
    if(typeof id === 'undefined'){
      id = Model[Model._primary_key]
    }
    if(id === 'undefined'){
      reject(new Error('IdNotDefined'))
    }
    Model.$processPending(Model, 'Delete')
    return Modely.knex.transaction(function (trx) {
      Model._trx = trx
      return trx(Model._name)
      .where(Model._columns[Model._primary_key].name, id)
      .del()
      .then(function(delete_response){
        return utils.pendingTransactions(Model,'Delete')
      })
      .catch(reject)      
      
    }).then(function(){
      Model._action = null
      return resolve()
    })
    .catch(function(error){
      Modely.log.error(error)
      return reject(error)
    }).finally(function(){
      Model._action = null
      return resolve()
    })
  })
}