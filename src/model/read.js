var Promise = require('bluebird')
var parsers = require('../parsers')

var Modely = require('../')
function getAllColumnsArray(Model) {
  var columns = Object.keys(Model._columns)
    .map(columnName => { return Model._columns[columnName].full_name })
  return columns
}
function loadSingle(Model, args) {
  return new Promise(function (resolve, reject) {
    var fields = getAllColumnsArray(Model)
    var whereObject = { }
    whereObject[Model._columns[Model._primary_key].full_name] = Model[Model._primary_key]
    Model._query = Modely.knex.select(fields)
                    .from(Model._name)
                    .where(whereObject)
    Modely.emit('Model:' + Model._name + ':BeforeLoad', Model)
    Model._query.then(function (queryResult) {
      var row
      switch (queryResult.length) {
        case 0: // NotFound
          reject(new Error('ModelNotFound'))
          break
        case 1: // Found
          row = queryResult[0]
          Model._row_cache = row
          parsers.row(Model)
          Modely.emit('Model:' + Model._name + ':AfterLoad', Model, row)
          // assign original values
          Model._data.original = Model._row_cache
          // clear the current values
          Model._data.values = { _meta: { } }
          Model._row_cache = null
          // apply results to the model
          Model._status = 'loaded'
          resolve(Model)
          break
        default: // Should never happen!
      }
    })
    .catch(error => {
      Modely.log.error(error)
      reject(error)
    })
  })
}

module.exports = function readModel(params) {
  var Model = this
  // check what parameters have been passed
  return new Promise(function (resolve, reject) {
    if (!isNaN(params) && !(params % 1)) {
      Model[Model._primary_key] = params
      return loadSingle(Model, params).then(resolve).catch(reject)
    } else {
      return Model.$search(params).then(resolve).catch(reject)
    }
  })
}
