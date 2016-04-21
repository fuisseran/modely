// processes one-to-many relationships on the model

var Modely
var parsers = require('../parsers')
var common = require('./common')

function getNewColumn(sourceColumn, targetColumn, source, target) {
  var newColumn = {
    column: {},
    model: null
  }
  // If there is no source column
  if (typeof sourceColumn === 'undefined' && typeof targetColumn !== 'undefined') {
    // Assign the model name to which the new column is to be added
    newColumn.model = source.model
    // Copy the column the required definitions from the related column
    newColumn.column[source.column] = {
      type: targetColumn.type,
      name: source.model + '_' + source.column,
      fullname: source.model + '.' + source.model + '_' + source.column
    }
    if (targetColumn.size) {
      newColumn.column[sourceColumn].size = targetColumn.size
    }
  } else if (typeof sourceColumn !== 'undefined' && typeof targetColumn === 'undefined') {
    // Assign the model name to which the new column is to be added
    newColumn.model = target.model
    // Copy the column the required definitions from the related column
    newColumn.column[target.column] = {
      type: sourceColumn.type,
      name: target.model + '_' + target.column,
      fullname: target.model + '.' + target.model + '_' + target.column,
      not_null: true
    }

    if (sourceColumn.size) {
      newColumn.column[targetColumn].size = sourceColumn.size
    }
  } else {
    // Return null if there is no column to add
    return null
  }
  if (sourceColumn.size) {
    newColumn.column[sourceColumn].size = sourceColumn.size
  }
  return newColumn
}

function oneToMany(modelName, args) {
  var newColumnName = null
  var sourceModel
  var sourceColumn
  var targetModel
  var targetColumn
  var newColumn
  if (typeof args === 'undefined' || args === null) {
    Modely.log.warn('Failed to create relationship for "%s", no relationship data provided',
    modelName)
    Modely.log.warn(args)
    return false
  }
  // check there is at least one target or source defined
  if (typeof args.source === 'undefined' && typeof args.target === 'undefined') {
    Modely.log.warn('Missing parameters in arguments for defining relationship')
    return false
  }
  common.parseArgs(args)
  args.source.model = common.getSourceModelName(modelName, args)
  args.target.model = common.getTargetModelName(modelName, args)
  args.source.column = common.getSourceColumnName(modelName, args)
  args.target.column = common.getTargetColumnName(modelName, args)
  if (args.target.model !== null && args.source.model !== null && args.target.column !== null &&
  args.source.column !== null) {
    // lets check if the source model and column exist
    sourceModel = Modely.models[args.source.model]
    sourceColumn = sourceModel.prototype._columns[args.source.column]
    targetModel = Modely.models[args.target.model]
    targetColumn = targetModel.prototype._columns[args.target.column]
    // New Column
    newColumn = getNewColumn(sourceColumn, targetColumn, args.source, args.target)
    if (newColumn) {
      newColumnName = Object.keys(newColumn.column)[0]
      parsers.columns(Modely.models[newColumn.model], newColumn.column)
      if (typeof targetColumn === 'undefined') {
        targetColumn = newColumn.column[newColumnName]
      } else if (typeof sourceColumn === 'undefined') {
        sourceColumn = newColumn.column[newColumnName]
      }
    }
    if (typeof Modely.relationships[modelName] === 'undefined') {
      Modely.relationships[modelName] = {}
    }
    if (typeof Modely.relationships[args.source.model][args.target.model] === 'undefined') {
      Modely.relationships[args.source.model][args.target.model] = {
        type: 'one-to-many',
        source: args.source,
        target: args.target,
        join: function (knexObj) {
          if (typeof knekObj === 'undefined') {
            return ' LEFT INNER JOIN ' + args.source.model + ' ON ' + targetColumn.full_name
            + ' = ' + sourceColumn.full_name + ' '
          }
          knexObj.innerJoin(args.source.model, args.source.column.full_name,
          args.target.column.full_name)
        }
      }
      if (typeof Modely.relationships[args.target.model] === 'undefined') {
        Modely.relationships[args.target.model] = {}
      }
      if (typeof Modely.relationships[args.target.model][args.source.model] === 'undefined') {
        Modely.relationships[args.target.model][args.source.model] = {
          type: 'many-to-one',
          source: args.source,
          target: args.target,
          join: function (knexObj) {
            if (typeof knekObj === 'undefined') {
              return ' LEFT INNER JOIN ' + args.source.model + ' ON ' + targetColumn.full_name
              + ' = ' + sourceColumn.full_name + ' '
            }
            knexObj.innerJoin(args.target.model, args.source.column.full_name,
            args.target.column.full_name)
          }
        }
      }
    } else {
      // Check the exisiting relationship if it is the same then do nothing, else produce a warning.
    }
  } else {
    Modely.log.error('[Modely] Unable to parse the relationship for model "%s"', modelName)
    Modely.log.error(args)
  }
}

module.exports = function (modelyReference) {
  Modely = modelyReference
  return oneToMany
}
