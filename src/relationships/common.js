var Modely = require('../index')

/**
 * Checks if a model exists
 * @param {string} name
 * @returns {boolean}
 */
function modelExists(name) {
  return typeof Modely.models[name] !== 'undefined'
}

/**
 * Parses the args and formats the strings into objects as required
 * @param {string} modelName - name of the model the relationship is being applied to
 * @param {object} args - arguments supplied to for the relationship
 * @returns {string}
 */
function parseArgs(args) {
  var params
  if (typeof args.source === 'undefined') {
    args.source = {}
  }
  // Create empty object if target is not defined
  if (typeof args.target === 'undefined') {
    args.target = {}
  }
  if (typeof args.source === 'string') {
    params = args.source.split('.')
    args.source = {
      model: params[0],
      column: params[1]
    }
  }
  if (typeof args.target === 'string') {
    params = args.target.split('.')
    args.target = {
      model: params[0],
      column: params[1]
    }
  }
}

/**
 * Gets the column name from the model if it is defined otherwise it returns the primary key name
 * @param {string} modelName Name of the model to look for the column
 * @param {string} columnlName Name of the column to check
 */
function getColumnName(modelName, columnlName) {
  var model = Modely.models[modelName]
  var column
  if (typeof model !== 'undefined') {
    column = model.prototype._columns[columnlName]
    if (typeof column === 'undefined') {
      return model.prototype._primary_key
    }
    return columnlName
  }
  return null
}

/**
 * Gets the Source model name for the relationship
 * @param {string} modelName - name of the model the relationship is being applied to
 * @param {object} args - arguments supplied to for the relationship
 * @returns {string}
 */
function getSourceModelName(modelName, args) {
  if (typeof args.source.model === 'undefined' || args.source.model === null) {
    if (modelExists(modelName)) {
      return modelName
    }
  } else {
    if (modelExists(args.source.model)) {
      return args.source.model
    }
  }
  return null
}

/**
 * Gets the Target model name for the relationship
 * @param {string} modelName - name of the model the relationship is being applied to
 * @param {object} args - arguments supplied to for the relationship
 * @returns {string}
 */
function getTargetModelName(modelName, args) {
  if (typeof args.target.model === 'undefined' || args.target.model === null) {
    if (modelExists(modelName)) {
      return modelName
    }
  } else {
    if (modelExists(args.target.model)) {
      return args.target.model
    }
  }
  return null
}

/**
 * Gets the source column name for the relationship
 * @param {string} modelName - name of the model the relationship is being applied to
 * @param {object} args - arguments supplied to for the relationship
 * @returns {string}
 */
function getSourceColumnName(model, args) {
  var Model = Modely.models[args.source.model]
  if (typeof args.source.column === 'undefined' || args.source.column === null) {
    // if there is no source.column defined then assume the source column is the
    // primary key of the source model
    /* I missed somethign here*/
    if (args.source.model === model) {
      return Model.prototype._primary_key
    }
    return Model.prototype._primary_key
  }
  if (typeof Model.prototype._columns[args.source.column] !== 'undefined') {
    return args.source.column
  }
  return null
}

/**
 * Gets the target column name for the relationship
 * @param {string} modelName - name of the model the relationship is being applied to
 * @param {object} args - arguments supplied to for the relationship
 * @returns {string}
 */
function getTargetColumnName(model, args) {
  var Model = Modely.models[args.target.model]
  if (typeof args.target.column === 'undefined' || args.target.column === null) {
    // if there is no target.column defined then assume the target column is the primary
    // key of the target model
    if (args.target.model === model) {
      return args.source.model + '_' + args.source.column
    }
    return args.source.model + '_' + Model.prototype._primary_key
  }
  if (typeof Model !== 'undefined' && typeof Model.prototype._columns[args.target.column] !==
  'undefined') {
    return args.target.column
  }
  Modely.log.error('[Modely] Unable to parse the relationship : Could not find the column "%s"' +
  ' on model "%s"', args.target.column, args.target.model)
  return null
}

/**
 *
 */
function copyColumn(source, target, skipProperties) {
  var model = Modely.models[source.model]
  var column
  var newColumn
  var skip = (typeof skipProperties === 'undefined') ? [] : skipProperties
  if (typeof model !== 'undefined') {
    column = model.prototype._columns[source.column]
    if (typeof column !== 'undefined') {
      newColumn = {}
      Object.keys(column).forEach(function (property) {
        if (skip.indexOf(property) === -1) {
          switch (property) {
            case 'name':
              newColumn[property] = target.model + '_' + target.column
              break
            case 'full_name':
              newColumn[property] = target.model + '.' + target.model + '_' + target.column
              break
            case 'model_name':
              newColumn[property] = target.model
              break
            default: newColumn[property] = column[property]
          }
        }
      })
      return newColumn
    }
    Modely.log.debug('[Modely] Failed to copy column "%s" from model "%s"', source.column, source.model)
    return null
  }
  Modely.log.debug('[Modely] Failed to copy column, unable to find model "%s"', source.column,
  source.model)
  return null
}

function addToQueue(modelName, args) {
  var relatedModelName = null
  if (typeof args.source.model !== 'undefined' && args.source.model !== modelName) {
    relatedModelName = args.source.model
  } else if (typeof args.target.model !== 'undefined' && args.target.model !== modelName) {
    relatedModelName = args.target.model
  }
  if (typeof Modely.relationshipsManager.pending[relatedModelName] === 'undefined') {
    Modely.relationshipsManager.pending[relatedModelName] = []
  }
  Modely.relationshipsManager.pending[relatedModelName].push({ model: modelName, args: args })
  Modely.log.debug('[Modely] Queuing "%s" relationship on "%s" model', args.type, modelName)
}

module.exports = {
  parseArgs: parseArgs,
  getSourceModelName: getSourceModelName,
  getTargetModelName: getTargetModelName,
  getSourceColumnName: getSourceColumnName,
  getTargetColumnName: getTargetColumnName,
  getColumnName: getColumnName,
  copyColumn: copyColumn,
  addToQueue: addToQueue
}
