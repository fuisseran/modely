module.exports = function (Model, properties) {
  var nonCoreProperties = {}
  Object.keys(properties).forEach(function (property) {
    if (typeof Model._columns[property] !== 'undefined') {
      Model[property] = properties[property]
    } else {
      if (property === '_meta') {
        if (typeof Model._data.values._meta === 'undefined') {
          Model._data.values._meta = {}
        }
        Object.keys(properties._meta).forEach(function (metaProperty) {
          Model._data.values._meta[metaProperty] = properties[property][metaProperty]
        })
      } else {
        nonCoreProperties[property] = properties[property]
      }
    }
  })
  Model._raw_properties = nonCoreProperties
  // Process the non core properties.
}
