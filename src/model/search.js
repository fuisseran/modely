var Modely = require('../')

function checkRelationship(modelName, relationshipName) {
  if (typeof Modely.relationships[modelName] !== 'undefined') {
    if (typeof Modely.relationships[modelName][relationshipName] !== 'undefined') {
      return Modely.relationships[modelName][relationshipName]
    }
    Modely.log.debug('[Modely] No relationships found from "%s" to "%s"', modelName,
    relationshipName)
    return null
  }
  Modely.log.debug('[Modely] No relationships have been defined for "%s"', modelName)
  return null
}

function getColumnFullName(modelName, columnName) {
  var tmp = Modely.models[modelName]
  if (typeof tmp !== 'undefined') {
    tmp = Modely.models[modelName].prototype._columns[columnName]
    if (typeof tmp !== 'undefined') {
      return tmp.full_name
    }
    Modely.log.debug('[Modely] Unable to find column "%s" on "%s" model', columnName, modelName)
    return null
  }
  Modely.log.debug('[Modely] Unable to find "%s" model', modelName)
  return null
}

function WhereObject(columnName, value) {
  if (!(this.constructor === WhereObject)) {
    return new WhereObject(columnName, value)
  }
  this[columnName] = value
}

function parseRelatedField(model, fieldString, value, returnObj) {
  var modelNames = fieldString.split('.')
  var columnName = modelNames.pop()
  var currentRelationship = null
  var modelName = null
  var previousModelName = model
  while (modelNames.length > 0) {
    modelName = modelNames.shift()
    currentRelationship = checkRelationship(previousModelName, modelName)
    if (currentRelationship) {
      returnObj.join.push(currentRelationship.join())
    }
    previousModelName = currentRelationship
    currentRelationship = null
  }
  returnObj.where.push(new WhereObject(getColumnFullName(modelName, columnName), value))
}

function getModelProperties(model) {
  var properties = []
  Object.keys(model._columns).forEach(function (columnName) {
    properties.push(columnName)
  })
  if (model._audit) {
    Object.keys(model._audit).forEach(function (columnName) {
      properties.push(columnName)
    })
  }
  return properties
}
/**
 * Query structure
 *  {
 *    query :
 *      {
 *        property: time,
 *        operator: =|LIKE|BETWEEN|>|<,
 *        value: value || [],
 *        and:[],
 *        or:[]
 *    }
 *    fields: [],
 *    limit:50,
 *    offset:0
 *  }
 *
 */
function parseFields(model, params) {
  var modelProperties = getModelProperties(model)
  var modelPropertyRegEx = new RegExp('^' + modelProperties.join('$|^') + '$')
  if (typeof params.query !== 'undefined') {
    Object.keys(params.query).forEach(function (field) {
      if (modelPropertyRegEx.test(field)) {
        params.where.push(new WhereObject(getColumnFullName(model._name, field),
        params.query[field]))
      } else if (/\w\.\w/.test(field)) {
        parseRelatedField(model._name, field, params.query[field], params)
      } else {
        Modely.log.debug('[Modley] No property "%s" on model "%s"', field, model._name)
      }
    })
  } else {
    Object.keys(model._columns).forEach(function () {
    })
  }
}

function formatParams(params) {
  var requiredProperties = {
    join: [],  // Join statements
    where: [], // Where statements
    limit: 20, // Default limit
    offset: 0, // Default offset
    fields: [] // Fields to return
  }
  Object.keys(requiredProperties).forEach(function (property) {
    if (typeof params[property] === 'undefined') {
      params[property] = requiredProperties[property]
    }
  })
}

function getFields(model, params) {
  // If there are no fields defined then grab the models fields
  if (params.fields.length === 0) {
    Object.keys(model._columns).forEach(function (column) {
      params.fields.push(model._columns[column].full_name)
    })
  }
}

module.exports = function modelSearch(params) {
  var model = this
  formatParams(params)
  parseFields(model, params)
  getFields(model, params)
  Modely.log.debug(params)
}
