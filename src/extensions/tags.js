var _ = require('underscore')
var async = require('async')
var Promise = require('bluebird')
var Modely = null
var models = {
  tag: {
    version: 1,
    auto_routes: false,
    columns: {
      id: 'integer not null auto increment primary key',
      is_internal: 'boolean',
      label: 'string unique',
      name: 'string unique'
    },
    primary_key: 'id',
    indexes: ['name', 'is_internal']
  },
  tag_mapping: {
    version: 1,
    auto_routes: false,
    columns: {
      id: 'integer not null auto increment primary key',
      model_name: 'string(100) not null',
      model_id: 'integer not null',
      tag_id: 'integer not null'
    },
    primary_key: 'id',
    indexes: ['model_name', 'model_id', 'tag_id']
  }
}

/**
 * Assigns default values to a new object that is beign created
 */
function assignTagDefaults(Model) {
  if (typeof Model._data.values._meta.tags === 'undefined') {
    Model._data.values._meta.tags = []
  }
  Model._data.original._meta.tags = []
}

/**
 * Parses the original tags on the model to determine if any need to be removed
 */
function parseOriginalTags(originalTags, currentTags) {
  var result = []
  originalTags.forEach(function (tag) {
    if (!_.findWhere(currentTags, tag)) {
      result.push(tag)
    }
  })
  return result
}

/**
 * Parses the currently assigned tags to see which need to be added
 */
function parseCurrentTags(currentTags, originalTags) {
  var result = []
  currentTags.forEach(function (tag) {
    if (!_.findWhere(originalTags, tag)) {
      result.push(tag)
    }
  })
  return result
}

/**
 * Parses the tags to add to the Model and see if any need to be created
 */
function parseTagsToAdd(tags) {
  return new Promise(function (resolve) {
    var result = []
    async.each(
      tags,
      function iterator(tag, callback) {
        if (typeof tag.id === 'undefined' || tag.id <= 0) {
          tag.name = _.slugify(tag.label)
          Modely.knex.raw('SELECT * FROM tag WHERE tag_name = ?', [tag.name])
            .then(function (queryResults) {
              if (queryResults.rows.length > 0) {
                tag.id = queryResults.rows[0].tag_id
                return callback()
              }
              result.push(tag)
              return callback()
            }).catch(function (error) {
              Modely.log.error(error)
            })
        } else {
          return callback()
        }
      },
      function done() {
        resolve(result)
      })
  })
}

/**
 * Processes the tags to determine which tags to add, remove or create.
 */
function getTagOperation(Model) {
  var originalTags
  var currentTags
  var removeTags
  var addTags
  return new Promise(function (resolve) {
    if (Model._action === 'create') {
      assignTagDefaults(Model)
    }
    originalTags = Model._data.original._meta.tags || []
    currentTags = Model._data.values._meta.tags || []
    removeTags = parseOriginalTags(originalTags, currentTags)
    addTags = parseCurrentTags(currentTags, originalTags)
    parseTagsToAdd(addTags).then(function (createTags) {
      resolve({
        create: createTags || [],
        remove: removeTags,
        add: addTags
      })
    }).catch(function () {
      resolve({
        create: [],
        remove: [],
        add: []
      })
    })
  })
}

/**
 * Registers the required models in Modely
 */
function registerModels() {
  Object.keys(models).forEach(function (modelName) {
    Modely.register(modelName, models[modelName])
  })
}

/**
 * Removes the tag mappings when the model is deleted
 */
function onDelete(Model) {
  if (Model._schema.taggable) {
    Model._pending_transactions.push(Model
      ._trx('tag_mapping')
      .where('tag_mapping_model_id', Model[Model._primary_key])
      .where('tag_mapping_model_name', Model._name)
      .del())
  }
}

/**
 * Added to the Model load query to pull the tagging information into
 */
function beforeLoad(Model) {
  if (Model._schema.taggable) {
    Model._query.select(Modely.knex.raw('(SELECT \'[\' || array_to_string( array_agg(' +
    '(\'{"id":\' || tag_id ||\',"label":"\'||tag_label||\'","name":"\'||tag_name||\'"}' +
    '\')), \',\')||\']\' FROM tag LEFT JOIN tag_mapping ON tag.tag_id = tag_mapping_tag_id ' +
    'WHERE tag_mapping_model_id = ? AND tag_mapping_model_name=?) as tags',
    [Model[Model._primary_key], Model._name]))
  }
}

function beforeSearch(params) {
  if (params.taggable) {
    params.query.select(Modely.knex.raw('(SELECT \'[\' || array_to_string( array_agg(' +
    '(\'{"id":\' || tag_id ||\',"label":"\'||tag_label||\'","name":"\'||tag_name||\'"}' +
    '\')), \',\')||\']\' FROM tag LEFT JOIN tag_mapping ON tag.tag_id = tag_mapping_tag_id ' +
    'WHERE tag_mapping_model_id = ' + params.idColumnName + ' AND tag_mapping_model_name=\'' +
     params.modelName + '\') as tags'))
  }
}

function searchParse(formattedRow, rowData) {
  if (typeof rowData.tags !== 'undefined') {
    formattedRow._meta.tags = rowData.tags
    delete rowData.tags
  }
}


/**
 * Processed the _row_cache converting the tag string to an object
 */
function afterLoad(Model, row) {
  if (Model._schema.taggable) {
    if (typeof Model._row_cache._meta === 'undefined') {
      Model._row_cache._meta = {}
    }
    if (typeof row.tags !== 'undefined' && row.tags !== null) {
      try {
        Model._row_cache._meta.tags = JSON.parse(row.tags.replace(/\\/g, '\\\\'))
      } catch (err) {
        Modely.log.error('[MODELY] An error occured will trying to parse the tagging data on "%s"',
        Model._name)
        Model.log.error(err)
        Model.log.error(row.tags)
      }
    } else if (row.tags === null) {
      Model._row_cache._meta.tags = []
    }
  }
}

/**
 * Executes before the model transacts on the database
 */
function beforeSave(Model) {
  if (Model._schema.taggable && (typeof Model._data.values._meta.tags !== 'undefined')) {
    Model._pending.push(new Promise(function (resolve) {
      getTagOperation(Model).then(function (tagChanges) {
        Model._stash.tags = tagChanges
        resolve()
      }).catch(function (error) {
        delete Model._stash.tags
        Modely.log.error('An error occured while trying to process the tagging information for ' +
        '"%s"', Model._name)
        Modely.log.error(error)
      })
    }))
  }
}

function onSave(Model) {
  var mappingsToAdd = []
  var tags
  var modelId
  var modelName
  if (Model._schema.taggable && typeof Model._stash.tags !== 'undefined') {
    tags = Model._stash.tags
    modelId = Model[Model._primary_key]
    modelName = Model._name
    // Delete removed tags from tag mappings table
    tags.remove.forEach(function (tag) {
      Model._pending_transactions.push(Model.
        _trx('tag_mapping')
        .where('tag_mapping_tag_id', tag.id)
        .where('tag_mapping_tag_model_id', modelId))
        .where('tag_mapping_model_name', modelName)
        .del()
    })
    // Create tags needed and add mappings
    tags.create.forEach(function (tag) {
      Model._pending_transactions.push(
        Model._trx.insert({
          tag_label: tag.label,
          tag_name: _.slugify(tag.label)
        }, 'tag_id').into('tag').then(function (insertResult) {
          Model._trx.insert({
            tag_mapping_model_name: modelName,
            tag_mapping_model_id: modelId,
            tag_mapping_tag_id: insertResult[0]
          }).into('tag_mapping')
        })
        )
    })
    // Build array or remaining tags to be added
    tags.add.forEach(function (tag) {
      if (typeof tag.id !== 'undefined') {
        mappingsToAdd.push({
          tag_mapping_model_name: modelName,
          tag_mapping_model_id: modelId,
          tag_mapping_tag_id: tag.id
        })
      }
    })
    // Add them to the pending transactions
    if (mappingsToAdd.length > 0) {
      Model._pending_transactions.push(Model._trx.insert(mappingsToAdd).into('tag_mapping'))
    }
  }
}

function onRegister(Model) {
  var value = false
  if (typeof Model.prototype._schema.taggable !== 'undefined' && 
  Model.prototype._schema.taggable === true) {
    value = true
  }
  Object.defineProperty(Model.prototype, '_taggable', {
    enumerable: false,
    value: value,
    configurable: false
  })
}

module.exports = function tagging(modelyReference) {
  // Reference to Model
  Modely = modelyReference
  // Register the models required for tagging
  registerModels()
  // Register events
  Modely.on('Model:*:BeforeLoad', beforeLoad)
  Modely.on('Model:*:AfterLoad', afterLoad)
  Modely.on('Model:*:BeforeSave', beforeSave)
  Modely.on('Model:*:OnSave', onSave)
  Modely.on('Model:*:OnDelete', onDelete)
  Modely.on('Modely:BeforeSearch', beforeSearch)
  Modely.on('Modely:SearchRowParse', searchParse)
  Modely.on('afterRegistration', onRegister)
  Modely.on('Model:tag:BeforeSave', function (Model) {
    return Model
  })
}
