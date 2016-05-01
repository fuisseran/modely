// TODO: Convert search into an extension
var Modely = require('../')
var Promise = require('bluebird')

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

function addJoin(model, relatedFullName, params) {
  var sourceModel = model
  var parts = relatedFullName.split('.')
  var targetModel = parts[0]
  var relationship = Modely.relationships[sourceModel]
  var i = params.join.length
  var dupe = false
  var join
  if (typeof relationship !== 'undefined') {
    relationship = Modely.relationships[sourceModel][targetModel]
    if (typeof relationship !== 'undefined') {
      join = relationship.join()
      while (i--) {
        if (params.join[i] === join) {
          dupe = true
        }
      }
      if (!dupe) {
        params.join.push(join)
      }
      return
    }
    Modely.log.error('[Modely] Unable to find relationship between "%s" and "%s"', sourceModel,
    targetModel)
  }
  Modely.log.error('[Modely] Unable to find "%s"', sourceModel)
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
  return properties
}
/**
 * Query structure notes
 *  {
 *    query :[
 *      {
 *        column: time,
 *        operator: =|LIKE|BETWEEN|>|<,
 *        value: value || [],
 *      },
 *      'and',
 *      {
 *        column: another_one
 *        operator:
 *        value:
 *      },
 *      'or'
 *      [{},'or',{}]
 *    ]
 *    fields: [],
 *    limit:50,
 *    offset:0
 *  }
 *
 */
function parseQueryString(str) {
  return str
  // TODO: create the ability to parse text querys
}

function parseQuery(model, params) {
  var modelProperties = getModelProperties(model)
  var modelPropertyRegEx = new RegExp('^' + modelProperties.join('$|^') + '$')
  var newWhereArray = []
  if (typeof params.query !== 'undefined' && typeof Array.isArray(params.query)) {
    Object.keys(params.query).forEach(function (queryItem) {
      var whereItem = null
      var parts = null
      if (typeof field === 'string') {
        switch (queryItem.toLowerCase()) {
          case 'and': case 'or': case 'not':
            whereItem = queryItem.toUpperCase()
            break
          default:
            whereItem = parseQueryString(queryItem)
        }
      } else {
        if (modelPropertyRegEx.test(queryItem.column)) {
          whereItem = new WhereObject(queryItem)
        } else if (/\w\.\w/.test(queryItem)) {
          // get related column name
          parts = queryItem.column.split('.')
          queryItem.column = getColumnFullName(parts[0], parts[1])
          whereItem = new WhereObject(queryItem)
        }
      }
      if (whereItem !== 'null') {
        newWhereArray.push(whereItem)  
      } else {
        Modely.log.debug('[Modley] No property "%s" on model "%s"', queryItem.column, model._name)
      }
    })
    return newWhereArray
  }
  return null
}

function formatParams(params) {
  var requiredProperties = {
    join: [],     // Join statements
    where: [],    // Where statements
    limit: 20,    // Default limit
    offset: 0,    // Default offset
    columns: [],  // Fields to return
    query: []     // The query
  }
  Object.keys(requiredProperties).forEach(function (property) {
    if (typeof params[property] === 'undefined') {
      params[property] = requiredProperties[property]
    }
  })
}

function getRelatedColumnFullName(field) {
  var parts = field.split('.')
  return getColumnFullName(parts[0], parts[1])
}

function parseResultRow(model, params, rowData) {
  var formattedRow = {
    _meta: {
    }
  }
  var modelPrefix = model._name + '_'
  Modely.emit('Modely:SearchRowParse', formattedRow, rowData)
  Object.keys(rowData).forEach(function (key) {
    var data = rowData[key]
    var property
    var subModel = null
    if (key.indexOf(modelPrefix) > -1) {
      property = key.replace(modelPrefix, '')
      formattedRow[property] = data
    } else {
      subModel = key.substring(0, key.indexOf('_'))
      property = key.substring(key.indexOf('_') + 1)
      if (typeof formattedRow[subModel] === 'undefined') {
        formattedRow[subModel] = {}
      }
      formattedRow[subModel][property] = data
    }
  })
  return formattedRow
}

function getColumns(model, params) {
  var modelProperties = getModelProperties(model)
  var modelPropertyRegEx = new RegExp('^' + modelProperties.join('$|^') + '$')
  // If there are no fields defined then grab the models fields
  if (params.columns.length === 0) {
    Object.keys(model._columns).forEach(function (column) {
      params.columns.push(model._columns[column].full_name)
    })
  } else {
    Object.keys(params.columns).forEach(function (fieldIndex) {
      var field = params.columns[fieldIndex]
      if (modelPropertyRegEx.test(field)) {
        params.columns[fieldIndex] = getColumnFullName(model._name, field)
      } else if (/\w\.\w/.test(field)) {
        params.columns[fieldIndex] = getRelatedColumnFullName(field)
        addJoin(model._name, params.columns[fieldIndex], params)
      }
    })
  }
}

module.exports = function modelSearch(params) {
  var model = this
  var result
  return new Promise(function (resolve, reject) {
    var statement = Modely.knex.from(model._name)
    formatParams(params)
    parseQuery(model, params)
    getColumns(model, params)
    statement.column(params.columns)
    params.join.forEach(function (join) {
      statement.joinRaw(join)
    })
    // var sqlString = statement.toSQL()
    result = params
    result.sql = statement.toSQL()
    if (params.limit > 0) {
      statement.limit(params.limit)
    }
    if (params.offset > 0) {
      statement.offset(params.offset)
    }
    Modely.emit('Modely:BeforeSearch', {
      taggable: model._schema.taggable,
      query: statement,
      idColumnName: model._columns[model._primary_key].full_name,
      modelName: model._name
    })
    return statement.then(function (queryResult) {
      var formattedResults = []
      queryResult.forEach(function (row) {
        var formattedRow = parseResultRow(model, params, row)
        if (formattedRow) {
          formattedResults.push(formattedRow)
        }
      })
      result.rows = formattedResults
      result.error = null
      return resolve(result)
    }).catch(function (err) {
      var newError = new Error('SearchError')
      result.rows = []
      result.error = err
      newError.data = result
      return reject(newError)
    })
  })
}
