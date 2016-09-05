var Promise = require('bluebird')

/** var typeRegex = {
  integer: /int[4]?/,
  string: /varchar/,
  datetime: /timestamptz/,
  bool: /bool/,
  boolean: /bool/,
  text: /text/,
  biginteger: /int8/,
  float: /float8/
}*/
/**
 * Module to create tables in database for model
 * */
// TODO: Mode this off the model and into the start up process parsign the models that have
//  successfully loaded and build mapping tables

var Modely = require('../')

function processProperty(table, Model, propertyName) {
  // This needs to be rewritten to allow passes for defining the columns then settign the
  // constraints so that a not null column can be added then all rows updated to make sure
  // they have a value, then the constraint applied
  var column = Model._columns[propertyName]
  var columnName = Model._name + '_' + propertyName
  var func = column.type
  var args = [columnName]
  var newColumn
  // Check if the property is the primary key
  if (propertyName === Model._primary_key || (column.primary && column.primary === true)) {
    table.increments(columnName).primary().unique()
  } else {
    // Process the property based on it's type
    switch (column.type) {
      case 'integer': case 'int':
        func = 'integer'
        break
      case 'float': case 'decimal':
        args.push(column.precision || null, column.scale || null)
        break
      case 'biginteger': case 'bigint':
        func = 'bigInteger'
        break
      case 'text':
        args.push(column.typeText || null)
        break
      case 'datetime':
        func = 'dateTime'
        break
      case 'boolean': case 'bool':
        func = 'boolean'
        break
      case 'binary':
        args.push(columnName, column.limit || null)
        break
      case 'string':
        if (typeof column.size !== 'undefined' && column.size !== null) {
          args.push(column.size)
        }
        break
      default:
    }
    newColumn = table[func].apply(table, args)
    if (column.default !== 'undefined' || column.default !== null) {
      newColumn.defaultTo(column.default)
    }
    if (column.not_null === true) {
      newColumn.notNullable()
    }
    if (Model._indexes && Model._indexes.indexOf(propertyName) > -1) {
      newColumn.index('idx_' + columnName)
    }
    if (column.unique === true) {
      newColumn.unique()
    }
  }
  return table
}


function compareColumn(/* source , target*/) {
  // TODO: this needs to be sorted
  return true
  /* if (typeRegex[source.data_type].test(target.udt_name)) {
    // check the column is of the correct type
    switch (source.type) {
      case 'string':
        if (source.size != target.size) {

        }
        break
        default:
    }
    // check if it is nullable
    return true
  } else {
    Modely.log.debug('[Model] Types do not match')
  }*/
}
/*
function checkRow(Model, row) {

}*/


/**
 * Checks the indexes int eh data base with the defined indexes on the Model and
 * adds/removes as required
 *   @param {object} Model
 *   @returns {void}
 */

function checkIndexes(Model) {
  return new Promise(function (resolve) {
    Modely.knex.raw('SELECT * FROM pg_indexes WHERE tablename=?', [Model._name])
      .then(function (indexesResult) {
        Modely.knex.schema.table(Model._name, function (table) {
          var currentIndexes = []
          indexesResult.rows.forEach(function (row) {
            var propertyName
            if (!(/_pkey|_unique$/).exec(row.indexname)) {
              propertyName = row.indexname.replace('idx_' + Model._name + '_', '')
              currentIndexes.push(propertyName)
              if (Model._indexes && Model._indexes.indexOf(propertyName) === -1) {
                table.dropIndex(Model._columns[propertyName].name, row.indexname)
                Modely.log.debug('[Modely] Removed index from "%s" property on "%s" Model',
                propertyName, Model._name)
              }
            }
          })
          Model._indexes.forEach(function (column) {
            var indexName = 'idx_' + Model._columns[column].name
            if (currentIndexes.indexOf(column) === -1) {
              table.index(Model._columns[column].name, indexName)
              Modely.log.debug('[Modely] Added index to "%s" property on "%s" Model', column,
              Model._name)
            }
          })
        }).then(function () {
          resolve()
        }).catch(function (err) {
          Modely.log.error('[MODELY] An error occured while checking indexes on "%s"', Model._name)
          Modely.log.error(err)
          resolve()
        })
      }).catch(function (err) {
        Modely.log.error('[MODELY] An error occured while reading indexes on "%s"', Model._name)
        Modely.log.error(err)
        resolve()
      })
  })
}

function getColumnData(Model) {
  return new Promise(function (resolve, reject) {
    Modely.knex.raw('SELECT column_name, is_nullable, column_default, data_type, ' +
    'character_maximum_length, character_octet_length, numeric_precision, udt_name FROM ' +
    'information_schema.columns WHERE table_name=? ORDER BY ordinal_position', [Model._name])
    .then(resolve)
    .catch(reject)
  })
}

function checkTable(Model) {
  return new Promise(function (resolve, reject) {
    getColumnData(Model)
      .then(function (schemaResult) {
        var schema = {
          columns: {}
        }
        var newSchema = {
          columns: {},
          indexes: Model._schema.indexes
        }
        var columnsToRemove = []
        // Build the found rows into an object
        schemaResult.rows.forEach(function (row) {
          var propertyName = row.column_name.replace(Model._name + '_', '')
          schema.columns[propertyName] = {
            size: row.character_maxiumum_length
          }
          if (typeof Model._columns[propertyName] === 'undefined') {
            columnsToRemove.push(row.column_name)
          } else {
            compareColumn(row, Model._columns[propertyName])
          }
        })
        // Check for any missing rows
        Object.keys(Model._columns).forEach(function (propertyName) {
          if (typeof schema.columns[propertyName] === 'undefined') {
            newSchema.columns[propertyName] = Model._columns[propertyName]
          }
        })
        return Modely.knex.schema.table(Model._name, function (table) {
          Object.keys(newSchema.columns).forEach(function (propertyName) {
            var cacheIndex
            var columnName = Model._name + '_' + propertyName
            processProperty(table, Model, propertyName)
            Modely.log.debug('[Modely] Added columm "%s" to "%s"', propertyName, Model._name)
            if (typeof Modely._cache.redundentColumns[Model._name] !== 'undefined') {
              cacheIndex = Modely._cache.redundentColumns[Model._name].indexOf(columnName)
              if (cacheIndex > -1) {
                Modely._cache.redundentColumns[Model._name].splice(cacheIndex, 1)
                Modely.log.debug('Removed "%s" from redundent columns cache', columnName)
                // remove model if there are no more redundent columns
                if (Modely._cache.redundentColumns[Model._name].length === 0) {
                  delete Modely._cache.redundentColumns[Model._name]
                }
              }
            }
            resolve()
          })
          if (columnsToRemove.length > 0) {
            if (typeof Modely._cache.redundentColumns[Model._name] === 'undefined') {
              Modely._cache.redundentColumns[Model._name] = []
            }
            columnsToRemove.forEach(function (column) {
              if (Modely._cache.redundentColumns[Model._name].indexOf(column) !== -1) {
                Modely._cache.redundentColumns[Model._name].push(column)
              }
              Modely.log.debug('[Modely] Added column "%s" from "%s" to redundent column cache',
              column, Model._name)
            })
          }
        }).catch(function (err) {
          Modely.log.error('[MODELY] An error occured while atempting to modify "%s"', Model._name)
          Modely.log.error(JSON.stringify(err, null, 2))
        })
          .then(function () {
            return checkIndexes(Model)
          })
          .then(function () {
            return resolve()
          })
      }).catch(function (err) {
        Model.log.error('[MODELY] Unable to get table schema to check against')
        Model.log.error(err)
        return reject(err)
      })
  })
}

/**
   * Creates table in the database for the model
   * @name $install
   * @returns {Object} Returns a promise that resolves when the operation is completed
   *                    either succesfully with .then() errors are caught with .catch()
   * */
module.exports = function () {
  var Model = this
  return new Promise(function (resolve, reject) {
    // var prefix = Model._name + '_'
    // Reference to the columns
    var columns = Model._columns
    // Prefix for the column names
    // Check if the database already has the models table
    Modely.knex.schema.hasTable(Model._name).then(function (exists) {
      if (!exists) {
        Modely.knex.schema.createTable(Model._name, function (table) {
          // Add property columns
          Object.keys(columns).forEach(function (key) {
            table = processProperty(table, Model, key)
          })
        }).then(function () {
          Modely.log.info('[Modely] Installed table "' + Model._name + '"')
          Modely.relationshipsManager.parse(Model._name).then(function () {
            Modely.models[Model._name].prototype._status = 'installed'
            resolve()
          })
        }).catch(function (error) {
          return reject(error)
        })
      } else {
        return checkTable(Model).then(function () {
          return Modely.relationshipsManager.parse(Model._name).then(function () {
            Modely.models[Model._name].prototype._status = 'installed'
            resolve()
          })
        }).catch(function (error) {
          return reject(error)
        })
      }
    })
  })
}
