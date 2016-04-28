// processes many-to-many relationships on the model
var Modely
var common = require('./common')
var modelyCommon = require('../common')

function addManyToManyRelationships(modelName, args) {
  var models = {
    join: Modely.models[modelName],
    source: Modely.models[args.source.model],
    target: Modely.models[args.target.model]
  }
  var modelNames = {}
  var columns
  Object.keys(models).forEach(function (model) {
    if (typeof models[model] === 'undefined') {
      Modely.log.error('[Modely] Unable to find "%s" model', model)
      return null
    }
    modelNames[model] = models[model].prototype._name
  })
  columns = {
    joinTarget: models.join.prototype._columns[args.target.model + '_' +
    args.target.column],
    joinSource: models.join.prototype._columns[args.source.model + '_' +
    args.source.column],
    source: models.source.prototype._columns[args.source.column],
    target: models.target.prototype._columns[args.target.column]
  }
  Object.keys(columns).forEach(function (column) {
    if (typeof columns[column] === 'undefined') {
      Modely.log.error('[Modely] Unable to find "%s" column', column)
      return null
    }
    columns[column] = columns[column].full_name
  })
  if (typeof Modely.relationships[args.source.model] === 'undefined') {
    Modely.relationships[args.source.model] = {}
  }
  if (typeof Modely.relationships[args.target.model] === 'undefined') {
    Modely.relationships[args.target.model] = {}
  }
  if (typeof Modely.relationships[args.source.model][args.target.model] === 'undefined') {
    Modely.relationships[args.source.model][args.target.model] = {
      type: 'many-to-many',
      source: args.source,
      target: args.target,
      join: function (knexObj) {
        if (typeof knekObj === 'undefined') {
          return ' LEFT JOIN ' + modelNames.join + ' ON ' + columns.joinSource + ' = '
          + columns.source + ' LEFT JOIN ' + modelNames.target + ' ON ' +
          columns.joinTarget + ' = ' + columns.target + ' '
        }
        knexObj.innerJoin(modelNames.join, columns.joinSource, columns.source)
        .innerJoin(modelNames.target, columns.joinTarget, columns.target)
      }
    }
  } else {
    // Should check against the existing relationship
  }
  if (typeof Modely.relationships[args.target.model][args.source.model] === 'undefined') {
    Modely.relationships[args.target.model][args.source.model] = {
      type: 'many-to-many',
      source: args.source,
      target: args.target,
      join: function (knexObj) {
        if (typeof knekObj === 'undefined') {
          return ' LEFT JOIN ' + modelNames.join + ' ON ' + columns.joinTarget + ' = ' +
          columns.target + ' LEFT JOIN ' + modelNames.source + ' ON ' + columns.joinSource +
          ' = ' + columns.source + ' '
        }
        knexObj.innerJoin(modelNames.target, columns.joinTarget, columns.target)
        .innerJoin(modelNames.join, columns.joinSource, columns.source)
      }
    }
  } else {
    // Should check against the existing relationship
  }
}

function manyToMany(modelName, args) {
  var mapModelName
  var parsedArgs = {
    source: {},
    target: {}
  }
  var modelProperties = {
    version: 1,
    columns: {
      id: 'integer not null auto increment primary key'
    },
    indexes: []
  }
  common.parseArgs(args)
  parsedArgs.source.model = common.getSourceModelName(modelName, args)
  parsedArgs.target.model = common.getTargetModelName(modelName, args)
  parsedArgs.source.column = common.getColumnName(parsedArgs.source.model, args.source.column)
  parsedArgs.target.column = common.getColumnName(parsedArgs.target.model, args.target.column)
  if (parsedArgs.source.model !== null && parsedArgs.source.column !== null &&
  parsedArgs.target.model !== null && parsedArgs.target.column !== null) {
    mapModelName = modelyCommon.camelize([parsedArgs.source.model, parsedArgs.target.model]
    .sort().join('') + 'map')
    Object.keys(parsedArgs).forEach(function (property) {
      var name
      var original = parsedArgs[property]
      if (typeof original.model !== 'undefined' && typeof original.column !== 'undefined') {
        name = original.model + '_' + original.column
        modelProperties.columns[name] = common.copyColumn(original, { model: mapModelName,
          column: name }, ['primary_key', 'unique', 'auto'])
        modelProperties.indexes.push(name)
      }
    })
    Modely.register(mapModelName, modelProperties)
    addManyToManyRelationships(mapModelName, parsedArgs)
    Modely.log.debug('[Modely] Added "%s" relationship between "%s" and "%s"', args.type, parsedArgs.source.model, parsedArgs.target.model)
  } else {
    common.addToQueue(modelName, args)
  }
}

module.exports = function (modelyReference) {
  Modely = modelyReference
  return manyToMany
}
