var Promise = require('bluebird')
var async = require('async')
/** 
 * Module to create tables in database for model
 * */
// TODO: Mode this off the model and into the start up process parsign the models that have successfully loaded and build mapping tables

var Modely = require('../')
/**
   * Creates table in the database for the model
   * @name $install
   * @returns {Object} Returns a promise that resolves when the operation is completed either succesfully with .then() errors are caught with .catch()
   * */
module.exports = function() {
  var Model = this
  return new Promise(function(resolve, reject) {

    // Reference to the model schema
    var schema = Model._schema

    // Prefix for the column names
    var prefix = Model._name + '_'

    // Reference to the columns
    var columns = Model._columns

    // Check if the database already has the models table
    Modely.knex.schema.hasTable(Model._name).then(function(exists) {
      if (!exists) {
        Modely.knex.schema.createTable(Model._name, function(table) {
          // Add property columns
          Object.keys(columns).forEach(function(key, index, _array) {
            table = process_property(table, Model, key)
          })
          // Add audit columns
          if (Model._audit) {
            table.integer(prefix + 'created_by').notNullable()
            table.dateTime(prefix + 'created_on').notNullable()
            table.integer(prefix + 'modified_by').notNullable()
            table.dateTime(prefix + 'modified_on').notNullable()
          }
        }).then(function(result) {
          Modely.log.info('[Modely] Installed table "' + Model._name + '"')
          return resolve(result)
        }).catch(function(error) {
          //Modely.log.error(error)
          return reject(error)
        })
      } else {
        return checkTable(Model).then(function() {
          return resolve()
        }).catch(function(error) {
          return reject(error)
        })
        //        return resolve(new Error('TableAlreadyExists'))
      }
    })
  })
}


function process_property(table, Model, property_name) {
  // This needs to be rewritten to allow passes for defining the columns then settign the constraints
  // so that a not null column can be added then all rows updated to make sure they have a value, then the constraint applied
  var column = Model._columns[property_name]
  var column_name = Model._name + '_' + property_name
  var func = column.type
  var args = [column_name]
  // Check if the property is the primary key
  if (property_name == Model._primary_key || (column.primary && column.primary === true)) {
    table.increments(column_name).primary().unique()
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
        args.push(column_name, column.limit || null)
        break
      case 'string':
        if (typeof column.size !== 'undefined' && column.size !== null) {
          args.push(column.size)
        }
        break
    }
    var new_column = table[func].apply(table, args)
    if (column.default) {
      new_column.defaultTo(column.default)
    }
    if (column.not_null === true){
      new_column.notNullable()
    }
    if (Model._indexes && Model._indexes.indexOf(property_name) > -1){
      new_column.index('idx_' + column_name)
    }
    if(column.unique === true){
      new_column.unique()
    }
  }
  return table
}
var type_regex = {
  integer: /int[4]?/,
  string: /varchar/,
  datetime: /timestamptz/,
  bool: /bool/,
  boolean: /bool/,
  text: /text/,
  biginteger: /int8/,
  float: /float8/
}

function compare_column(source, target) {
  // TODO: this needs to be sorted
  return true
  if (type_regex[source.data_type].test(target.udt_name)) { // check the column is of the correct type
    switch (source.type) {
      case 'string':
        if (source.size != target.size) {

        }
        break
    }
    // check if it is nullable
    return true
  } else {
    Modely.log.debug('[Model] Types do not match')
  }
}

function checkRow(Model, row) {

}


/**
 * Checks the indexes int eh data base with the defined indexes on the Model and adds/removes as required
 * @param {object} Model
 * @returns {void}
 */

function checkIndexes(Model) {
  return new Promise(function(resolve, reject) {
    Modely.knex.raw("SELECT * FROM pg_indexes WHERE tablename=?", [Model._name])
      .then(function(indexes_result) {
        Modely.knex.schema.table(Model._name, function(table) {
          
          var currentIndexes = []
          indexes_result.rows.forEach(function(row){
            if (!(/_pkey|_unique$/).exec(row.indexname)) {
              var property_name = row.indexname.replace('idx_' + Model._name + '_', '')
              currentIndexes.push(property_name)
              if (Model._indexes && Model._indexes.indexOf(property_name) === -1) {
                table.dropIndex(Model._columns[property_name].name, row.indexname)
                Modely.log.debug('[Modely] Removed index from "%s" property on "%s" Model', property_name, Model._name)
              }
            }
          })
          Model._indexes.forEach(function(column){
              var index_name = 'idx_' + Model._columns[column].name
              if (currentIndexes.indexOf(column) === -1) {
                table.index(Model._columns[column].name, index_name)
                Modely.log.debug('[Modely] Added index to "%s" property on "%s" Model', column, Model._name)
              }
          })
        }).then(function(res){
          resolve()
        }).catch(function(err) {
          Modely.log.error(err)
          resolve()
        })
      }).catch(function(err) {

        Modely.log.error(err)
        resolve()
      })
  })
}

function getColumnData(Model) {
  return new Promise(function(resolve, reject) {
    Modely.knex.raw("SELECT column_name, is_nullable, column_default, data_type, character_maximum_length, " +
      "character_octet_length, numeric_precision, udt_name FROM information_schema.columns WHERE table_name=? " +
      "ORDER BY ordinal_position", [Model._name]).then(resolve)
  })
}

function checkTable(Model) {
  return new Promise(function(resolve, reject) {
    getColumnData(Model)
      .then(function(schema_result) {
        var schema = {
          columns: {}
        }
        var columns_to_remove = []
        // Build the found rows into an object
        schema_result.rows.forEach(function(row, row_index, _rows) {
          var property_name = row.column_name.replace(Model._name + '_', '')
          schema.columns[property_name] = {
            size: row.character_maxiumum_length
          }
          if (typeof Model._columns[property_name] === 'undefined' && typeof Model._audit[property_name] === 'undefined') {
            columns_to_remove.push(row.column_name)
          } else {
            compare_column(row, Model._columns[property_name])
          }
        })
        // Check for any missing rows
        var new_schema = {
          columns: {},
          indexes: Model._schema.indexes
        }

        Object.keys(Model._columns).forEach(function(property_name) {
          if (typeof schema.columns[property_name] === 'undefined') {
            new_schema.columns[property_name] = Model._columns[property_name]
          }
        })
        var new_properties = Object.keys(new_schema.columns)
        Modely.knex.schema.table(Model._name, function(table) {
          new_properties.forEach(function(property_name) {
            process_property(table, Model, property_name)
            Modely.log.info('[Modely] Added columm "%s" to "%s"', property_name, Model._name)
            resolve()
          })
          columns_to_remove.forEach(function(column) {
            // TODO: Back up the data before deleting it
            table.dropColumn(column)
            Modely.log.info('[Modely] Dropped column "%s" from "%s"', column, Model._name)
          })
        }).catch(function(err) {
          console.log(err)
        })
          .then(function() { 
            return checkIndexes(Model) 
          })
          .then(function(tmp){
            resolve()
          })

      }).catch(function(err) {
        Model.log.error('[MODELY] Unable to get table schema to check against')
        Model.log.error(err)
        reject(err)
      })
  })
}
