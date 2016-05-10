// Processes one-to-one relationships on the model
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
      not_null: true,
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
      unique: true
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


function oneToOne(modelName, args) {
  var sourceModel
  var sourceColumn
  var targetModel
  var targetColumn
  var newColumn
  var newColumnName
  var modified = []
  var parsedArgs = {
    source: {},
    target: {}
  }
  // Check that arguments were passed
  if (typeof args === 'undefined' || args === null) {
    Modely.log.warn('[Modely] Failed to create relationship for "%s", no relationship data ' +
    'provided', modelName)
    Modely.log.warn(args)
    return false
  }
  // check there is at least one target or source defined
  if (typeof args.source === 'undefined' && typeof args.target === 'undefined') {
    Modely.log.warn('[Modely] Missing parameters in arguments for defining relationship')
    return false
  }
  // TODO: this needs neatening up
  common.parseArgs(args)
  parsedArgs.source.model = common.getSourceModelName(modelName, args)
  parsedArgs.target.model = common.getTargetModelName(modelName, args)
  parsedArgs.source.column = common.getSourceColumnName(modelName, parsedArgs)
  parsedArgs.target.column = common.getTargetColumnName(modelName, parsedArgs)
  // If there is a target and source apply them to the model
  if (parsedArgs.target.model !== null && parsedArgs.source.model !== null &&
  parsedArgs.target.column !== null && parsedArgs.source.column !== null) {
    // lets check if the source model and column exist
    sourceModel = Modely.models[parsedArgs.source.model]
    sourceColumn = sourceModel.prototype._columns[parsedArgs.source.column]
    targetModel = Modely.models[parsedArgs.target.model]
    targetColumn = targetModel.prototype._columns[parsedArgs.target.column]
    newColumn = getNewColumn(sourceColumn, targetColumn, parsedArgs.source, parsedArgs.target)
    if (newColumn) {
      if (modified.indexOf(newColumn.model) === -1) {
        modified.push(newColumn.model)
      }
      newColumnName = Object.keys(newColumn.column)[0]
      parsers.columns(Modely.models[newColumn.model], newColumn.column)
      if (typeof targetColumn === 'undefined') {
        targetColumn = newColumn.column[newColumnName]
      } else if (typeof sourceColumn === 'undefined') {
        sourceColumn = newColumn.column[newColumnName]
      }
    }
    if (typeof Modely.relationships[parsedArgs.source.model] === 'undefined') {
      Modely.relationships[parsedArgs.source.model] = {}
    }
    if (typeof Modely.relationships[parsedArgs.target.model] === 'undefined') {
      Modely.relationships[parsedArgs.target.model] = {}
    }
    if (typeof Modely.relationships[parsedArgs.source.model][parsedArgs.target.model] ===
    'undefined') {
      Modely.relationships[parsedArgs.source.model][parsedArgs.target.model] = {
        type: 'one-to-one',
        source: parsedArgs.source,
        target: parsedArgs.target,
        join: function (knexObj) {
          if (typeof knekObj === 'undefined') {
            return ' LEFT OUTER JOIN "' + parsedArgs.target.model + '" ON "' + sourceColumn
            .full_name.split('.').join('"."') + '" = "' + targetColumn.full_name.split('.')
            .join('"."') + '" '
          }
          knexObj.leftOuterJoin(args.source.model, sourceColumn.fullname,
          targetColumn.fullname)
        }
      }
      Modely.log.debug('[Modely] Added "one-to-one" relationship from "%s.%s" to "%s.%s"',
      parsedArgs.source.model, parsedArgs.source.column, parsedArgs.target.model, parsedArgs
      .target.column)
    } else {
      // Check the exisiting relationship if it is the same then do nothing, else produce a warning.
    }
    if (typeof Modely.relationships[parsedArgs.target.model][parsedArgs.source.model] ===
    'undefined') {
      Modely.relationships[parsedArgs.target.model][parsedArgs.source.model] = {
        type: 'one-to-one',
        source: parsedArgs.source,
        target: parsedArgs.target,
        join: function (knexObj) {
          if (typeof knekObj === 'undefined') {
            return ' LEFT OUTER JOIN "' + parsedArgs.source.model + '" ON "' + sourceColumn
            .full_name.split('.').join('"."') + '" = "' + targetColumn.full_name.split('.')
            .join('"."') + '" '
          }
          knexObj.leftOuterJoin(parsedArgs.target.model, sourceColumn.full_name,
          targetColumn.full_name)
        }
      }
      Modely.log.debug('[Modely] Added "one-to-one" relationship from "%s.%s" to "%s.%s"',
      parsedArgs.target.model, parsedArgs.target.column, parsedArgs.source.model, parsedArgs
      .source.column)
    } else {
      // Check the exisiting relationship if it is the same then do nothing, else produce a warning.
    }
  } else {
    common.addToQueue(modelName, args)
  }
  return modified
}

module.exports = function (modelyReference) {
  Modely = modelyReference
  return oneToOne
}
