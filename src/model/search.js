// TODO: Convert search into an extension
var Modely = require('../')
var Promise = require('bluebird')

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

function WhereObject(args) {
  if (!(this.constructor === WhereObject)) {
    return new WhereObject(args)
  }
  this.column = args.column
  this.op = args.op || '='
  this.value = args.value
}

WhereObject.prototype.render = function render(paramsArray) {
  var output = ''
  var columnName = '"' + this.column.split('.').join('"."') + '"'
  switch (this.op) {
    case 'BETWEEN':
      output = [columnName, this.op, '?', 'AND', '?'].join(' ')
      break
    default:
      output = [columnName, this.op, '?'].join(' ')
  }
  if (this.value === null) { 
    switch (this.op) {
      case '!=':
        output = columnName + ' is not null'
        break
      default:
        output = columnName + ' is null'
    }    
  } else {
    if (Array.isArray(this.value)) {
      paramsArray = paramsArray.concat(this.value)
    } else {
      paramsArray.push(this.value)
    }
  }
  return output
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
 *        op: =|LIKE|BETWEEN|>|<,
 *        value: value || [],
 *      },
 *      'and',
 *      {
 *        column: another_one
 *        op:
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
  var lastStatement = null
  if (typeof params.query !== 'undefined' && typeof Array.isArray(params.query)) {
    params.query.forEach(function (queryItem, index) {
      var whereItem = null
      var parts = null
      if (typeof queryItem === 'string') {
        switch (queryItem.toLowerCase()) {
          case 'and': case 'or': case 'not':
             
            whereItem = queryItem.toUpperCase()
            break
          default:
            whereItem = parseQueryString(queryItem)
        }
      } else if (Array.isArray(queryItem)) {
        parseQuery()
      } else {
        if (Object.keys(queryItem).length === 1) {
          queryItem = {
            column: Object.keys(queryItem)[0],
            value: queryItem[Object.keys(queryItem)[0]]
          }
        }
        if (modelPropertyRegEx.test(queryItem.column)) {
          queryItem.column = getColumnFullName(model._name, queryItem.column)
          whereItem = new WhereObject(queryItem)
        } else if (/\w\.\w/.test(queryItem.column)) {
          // get related column name
          parts = queryItem.column.split('.')
          queryItem.column = getColumnFullName(parts[0], parts[1])
          whereItem = new WhereObject(queryItem)
        }
      }
      
      if (whereItem !== 'null') {
        if (index > 0) {
          if (typeof whereItem !== 'string' && typeof lastStatement !== 'string') {
            newWhereArray.push('OR')
          }
        }
        newWhereArray.push(whereItem)
        lastStatement = whereItem
      } else {
        Modely.log.debug('[Modley] No property "%s" on model "%s"', queryItem.column, model._name)
      }
    })
    return newWhereArray
  }
  return newWhereArray
}

function formatParams(params) {
  var requiredProperties = {
    join: [],     // Join statements
    where: [],    // Where statements
    limit: 20,    // Default limit
    offset: 0,    // Default offset
    columns: [],  // Fields to return
    query: [],    // The query
    parameters: [] // paramters to add to the query
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
  var modelProperties = Object.keys(model._columns)
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
  var processedQuery = []
  return new Promise(function (resolve, reject) {
    var statement = Modely.knex.from(model._name)
    var whereStatment = ''
    formatParams(params)
    processedQuery = parseQuery(model, params)
    getColumns(model, params)
    statement.column(params.columns)
    params.join.forEach(function (join) {
      statement.joinRaw(join)
    })
    processedQuery.forEach(function (queryItem) {
      whereStatment += (typeof queryItem === 'string') ? queryItem : queryItem.render(params
      .parameters)
    })
    statement.whereRaw(whereStatment, params.parameters) 
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
