module.exports = function(Model, Properties){
  var nonCoreProperties={}
  Object.keys(Properties).forEach(function(property, index, _array){
    if(typeof Model._columns[property] !== 'undefined'){
      Model[property] = Properties[property]
    } else {
      nonCoreProperties[property] = Properties[property]
    }
  })
  Model._raw_properties =  nonCoreProperties
  // Process the non core properties.
}