module.exports = function(Model){
  // Probably should delete the column from the row cache, not sure atm
  var prefix = Model._name + '_'
  var row = Model._row_cache
  Object.keys(row).forEach(function(key){
    var property = key.replace(prefix, '')
    if(typeof Model._columns[property] !== 'undefined' || (Model._audit && typeof Model._audit[property] !== 'undefined')){
      Model._data.original[key] = row[key]
    }
  })
}