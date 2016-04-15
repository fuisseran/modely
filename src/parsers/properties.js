module.exports = function (Model, Properties) {
  var nonCoreProperties = {}
  Object.keys(Properties).forEach(function (property) {
    if (typeof Model._columns[property] !== 'undefined') {
      Model[property] = Properties[property]
    } else {
      nonCoreProperties[property] = Properties[property]
    }
  })
  Model._raw_properties = nonCoreProperties
  // Process the non core properties.
}
