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
    case '!=':
      output = ['NOT', columnName, '=', '?'].join(' ')
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
  Object.keys(model._columns).forEach(columnName => { properties.push(columnName) })
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
          addJoin(model._name, queryItem.column, params)
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
    join: [],       // Join statements
    where: [],      // Where statements
    limit: 20,      // Default limit
    offset: 0,      // Default offset
    columns: [],    // Fields to return
    query: [],      // The query
    parameters: [],  // paramters to add to the query
    orderBy: []
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
  Modely.emit('Model:' + model._name + ':BeforeSearchRowParse', model, formattedRow, rowData)
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
  Modely.emit('Model:' + model._name + ':AfterSearchRowParse', formattedRow, rowData)
  return formattedRow
}

function getColumns(model, params) {
  var modelProperties = Object.keys(model._columns)
  var modelPropertyRegEx = new RegExp('^' + modelProperties.join('$|^') + '$')
  // If there are no fields defined then grab the models fields
  if (params.columns.length === 0) {
    Object.keys(model._columns)
      .forEach(column => { params.columns.push(model._columns[column].full_name) })
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

module.exports = function modelSearch(params, options) {
  var model = this
  var result
  var whereStrings = []
  var processedQuery = []
  return new Promise(function (resolve, reject) {
    var i = 0
    var whereStatment = ''
    model._query = Modely.knex.from(model._name)
    formatParams(params)
    processedQuery = parseQuery(model, params)
    getColumns(model, params)
    Modely.emit('Model:' + model._name + ':BeforeSearch', model, params)
    if (options) {
      if (options.columns && Array.isArray(options.columns)) {
        params.columns = params.columns.concat(options.columns)
      }
      if (options.join && Array.isArray(options.join)) {
        params.join = params.join.concat(options.join)
      }
    }
    model._query.select(params.columns)
    params.join.forEach(join => { model._query.joinRaw(join) })
    params.orderBy.forEach(function (item) {
      if (Array.isArray(item) && item.length < 3) {
        model._query.orderBy(item[0], item[1] || null)
      } else if (typeof item === 'string') {
        model._query.orderByRaw(item)
      } else {
        Modely.log.warn('Ignored "%s" in order by clause', item)
      }
    })
    processedQuery.forEach(function (queryItem) {
      whereStrings.push((typeof queryItem === 'string') ? queryItem : queryItem.render(params
      .parameters))
    })
    whereStatment = whereStrings.join(' ')
    model._query.whereRaw(whereStatment, params.parameters)
    // var sqlString = statement.toSQL()
    result = params
    if (process.env.NODE_ENV === 'development') {
      result.sql = model._query.toSQL()
    }
    if (params.limit > 0) {
      model._query.limit(params.limit)
    }
    if (params.offset > 0) {
      model._query.offset(params.offset)
    }
    return model._query.then(function (queryResult) {
      var formattedResults = []
      queryResult.forEach(function (row) {
        var formattedRow = parseResultRow(model, params, row)
        if (formattedRow) {
          formattedResults.push(formattedRow)
        }
      })
      // Check that there are no objects that can cause circular reference errors in the columns
      // This fixes issue with nested raw statements in the columns array
      i = params.columns.length
      while (i--) {
        if (typeof params.columns[i] !== 'string') {
          params.columns[i] = params.columns[i].toString()
        }
      }
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
