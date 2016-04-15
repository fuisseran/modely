// processes many-to-many relationships on the model
var Modely
var common = require('./common')

function manyToMany(modelName, args) {
  var mapModelName
  var modelProperties = {
    version: 1,
    columns: {
      id: 'integer not null auto increment primary key'
    },
    indexes: []
  }
  common.parseArgs(args)
  args.source.model = common.getSourceModelName(modelName, args)
  args.target.model = common.getTargetModelName(modelName, args)
  args.source.column = common.getColumnName(args.source.model, args.source.column)
  args.target.column = common.getColumnName(args.target.model, args.target.column)
  if (args.source.model !== null && args.source.column !== null && args.target.model !== null &&
  args.target.column !== null) {
    mapModelName = [args.source.model, args.target.model].sort().join('_') + '_map'
    Object.keys(args).forEach(function (property) {
      var name
      var original = args[property]
      if (typeof original.model !== 'undefined' && typeof original.column !== 'undefined') {
        name = original.model + '_' + original.column
        modelProperties.columns[name] = common.copyColumn(original, { model: mapModelName,
          column: name }, ['primary_key', 'unique', 'auto'])
        modelProperties.indexes.push(name)
      }
    })
    Modely.register(mapModelName, modelProperties)
  } else {
    Modely.log.error('[Modely] Unable to create mapping table for "%s" model', modelName)
    Modely.log.error(args)
  }
}

module.exports = function (modelyReference) {
  Modely = modelyReference
  return manyToMany
}
