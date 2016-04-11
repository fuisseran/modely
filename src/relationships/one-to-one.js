// Processes one-to-one relationships on the model
var Modely
var parsers = require('../parsers')

function modelExists(name) {
  return typeof Modely.models[name] === 'undefined' ? false : true
}

function getSourceModelName(model_name, args) {
  if (typeof args.source.model === 'undefined' || args.source.model === null) {
    if (modelExists(model_name)) {
      return model_name
    }
  } else {
    if (modelExists(args.source.model)) {
      return args.source.model
    }
  }
  return null
}

function getTargetModelName(model_name, args) {
  if (typeof args.target.model === 'undefined' || args.target.model === null) {
    if (modelExists(model_name)) {
      return model_name
    }
  } else {
    if (modelExists(args.target.model)) {
      return args.target.model
    }
  }
  return null
}

function getSourceColumnName(model, args) {
  var Model = Modely.models[args.source.model]
  if (typeof args.source.column === 'undefined' || args.source.column === null) {
    // if there is no source.column defined then assume the source column is the primary key of the source model
    if (args.source.model === model) {
      return Model.prototype._primary_key
    } else {
      return Model.prototype._primary_key
    }
  } else {
    if (typeof Model.prototype._columns[args.source.column] !== 'undefined') {
      return args.source.column
    }
  }
  return null
}

function getTargetColumnName(model, args) {
  var Model = Modely.models[args.target.model]
  if (typeof args.target.column === 'undefined' || args.target.column === null) {
    // if there is no target.column defined then assume the target column is the primary key of the target model
    if (args.target.model === model) {
      return args.source.model + '_' + args.source.column
    } else {
      return args.source.model + '_' + Model.prototype._primary_key
    }
  } else {
    if (typeof Model.prototype._columns[args.target.column] !== 'undefined') {
      return args.target.column
    }
  }
  return null
}

function getNewColumn(source_column, target_column, source, target) {

  var new_column = {
    column: {},
    model: null
  }
  // If there is no source column
  if (typeof source_column === 'undefined' && typeof target_column !== 'undefined') {
    // Assign the model name to which the new column is to be added
    new_column.model = source.model
    // Copy the column the required definitions from the related column
    new_column.column[source.column] = {
      type: target_column.type,
      not_null: true,
      name: source.model + '_' + source.column,
      fullname: source.model + '.' + source.model + '_' + source.column
    }
    if (target_column.size) {
      new_column.column[source_column].size = target_column.size
    }
  } else if (typeof source_column !== 'undefined' && typeof target_column === 'undefined') {
    // Assign the model name to which the new column is to be added
    new_column.model = target.model
    // Copy the column the required definitions from the related column
    new_column.column[target.column] = {
      type: source_column.type,
      name: target.model + '_' + target.column,
      fullname: target.model + '.' + target.model + '_' + target.column,
      unique:true
    }

    if (source_column.size) {
      new_column.column[target_column].size = source_column.size
    }
  } else {
    // Return null if there is no colun to add
    return null

  }

  if (source_column.size) {
    new_column.column[source_column].size = source_column.size
  }
  return new_column
}


function oneToOne(model_name, args) {
  // Check that arguments were passed
  if (typeof args === 'undefined' || args === null) {
    Modely.log.warn('Failed to create relationship for "%s", no relationship data provided', model_name)
    Modely.log.warn(args)
    return false
  }
  // check there is at least one target or source defined
  if (typeof args.source === 'undefined' && typeof args.target === 'undefined') {
    Modely.log.warn('Missing parameters in arguments for defining relationship')
    return false
  }
  // Create empty object if source is not defined
  if (typeof args.source === 'undefined') {
    args.source = {}
  }
  // Create empty object if target is not defined
  if (typeof args.target === 'undefined') {
    args.target = {}
  }
  if(typeof args.source === 'string'){
    var params = args.source.split('.')
    args.source = {
      model : params[0],
      column : params[1]
    }
  }
  if(typeof args.target === 'string'){
    var params = args.target.split('.')
    args.target = {
      model : params[0],
      column : params[1]
    }
  }
  args.source.model = getSourceModelName(model_name, args)
  if (args.source.model === null) {
    Modely.log.error('Unable to parse the relationship : Could not find the model "%s"', model_name)
    return false
  }
  args.target.model = getTargetModelName(model_name, args)
  if (args.target.model === null) {
    Modely.log.error('Unable to parse the relationship : Could not find the model "%s"', args.target.model)
    return false
  }
  args.source.column = getSourceColumnName(model_name, args)
  if (args.source.column === null) {
    Modely.log.error('Unable to parse the relationship : Could not find the column "%s" on model "%s"', args.source.column, args.source.model)
    return false
  }

  args.target.column = getTargetColumnName(model_name, args)
  if (args.target.model === null) {
    Modely.log.error('Unable to parse the relationship : Could not find the column "%s" on model "%s"', args.target.column, args.target.model)
    return false
  }
  // If there is a target and source apply them to the model
  if (args.target.model !== null && args.source.model !== null && args.target.column !== null && args.source.column) {
    // lets check if the source model and column exist
    var source_model = Modely.models[args.source.model]
    var source_column = source_model.prototype._columns[args.source.column]

    var target_model = Modely.models[args.target.model]
    var target_column = target_model.prototype._columns[args.target.column]
    // New Column 
    var new_column = typeof target_column === 'undefined' ? getNewColumn(source_column, target_column, args.source, args.target) : getNewColumn(target_column, source_column, args.target, args.source)
    if (new_column) {
      parsers.columns(Modely.models[new_column.model], new_column.column)
    }
    if (typeof Modely.relationships[model_name] === 'undefined') {
      Modely.relationships[model_name] = {}
    }
    var origin = args.source.model === model_name ? args.source.model : args.target.model
    if (typeof Modely.relationships[model_name][origin] === 'undefined') {
      Modely.relationships[model_name][origin] = {
        type: 'one-to-one',
        source: args.source,
        target: args.target,
        join: function(knex_obj) {
          if (typeof knek_obj === 'undefined') {
            return ' LEFT OUTER JOIN ' + origin + ' ON ' + args.source.column.fullname + ' = ' + args.target.column.fullname + ' '
          } else {
            knex_obj.leftOuterJoin(origin, args.source.column.fullname, args.target.column.fullname)
          }
        }
      }
    } else {
      // Check the exisiting relationship if it is the same then do nothing, else produce a warning.
    }

  }

}
module.exports = function(modely_reference) {
  Modely = modely_reference
  return oneToOne
}