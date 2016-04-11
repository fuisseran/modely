var Promise = require('bluebird')
var async = require('async')
var parsers = require('../parsers')

var Modely = require('../')
function get_all_columns_array(Model){
  var columns = Object.keys(Model._columns).map(function(column_name){
    return Model._columns[column_name].full_name  
  })
  if(Model._audit){
    Object.keys(Model._audit).forEach(function(column_name){
      columns.push(Model._audit[column_name].full_name)
    })
  }
  return columns
}
function load_single(Model, id){
  return new Promise(function(resolve, reject){
    var fields = get_all_columns_array(Model)
    var where_object = { }
    
    where_object[Model._columns[Model._primary_key].full_name] = Model[Model._primary_key]
    
    Model._query = Modely.knex.select(fields)
                    .from(Model._name)
                    .where(where_object)
                    
    Modely.emit('Model:' + Model._name + ':BeforeLoad', Model)
    Model._query.then(function(query_result){
      switch(query_result.length){
        case 0: // NotFound
          reject(new Error('ModelNotFound'))
        break
        case 1: // Found
          var row = query_result[0]
          Model._row_cache = row
          parsers.row(Model)
          Modely.emit('Model:' + Model._name + ':AfterLoad', Model, row)
          // assign original values
          Model._data.original = Model._row_cache
          // clear the current values
          Model._data.values = {_meta:{}}
          Model._row_cache = null
          // apply results to the model
          Model._status = 'loaded'
          resolve(Model)
        break
        default: // Should never happen!
      }
    }).catch(function(error){
      Modely.log.error(error)
      reject(error)
    })
  })
}

module.exports = function read_model(params){
  var Model = this
  // check what parameters have been passed
  return new Promise(function(resolve,reject){
    if(!isNaN(params) && !(params % 1)){
      load_single(Model, params).then(resolve).catch(function(error){
        //Model.log.error('[MODELY] - Failed to load "' + params + '"')
        //Model.log.error(error)
        console.log(error)
      })
    } else {
      // TODO: filtered load
      resolve()
    }
  })
}
