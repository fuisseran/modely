var _ = require('underscore')
var async = require('async')

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
 * Registers the required models in Modely
 */
function registerModels() {
  Object.keys(models).forEach(function (model_name) {
    Modely.register(model_name, models[model_name])
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
    Model._query.select(Modely.knex.raw("(SELECT '[' || array_to_string( array_agg( ('{\"id\":' || tag_id " +
      "||',\"label\":\"'||tag_label||'\",\"name\":\"'||tag_name||'\"}')), ',')||']' FROM tag LEFT JOIN " +
      "tag_mapping ON tag.tag_id = tag_mapping_tag_id WHERE tag_mapping_model_id = ? AND " +
      "tag_mapping_model_name=?) as tags", [Model[Model._primary_key], Model._name]))
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
        Modely.log.error('[MODELY] An error occured will trying to parse the tagging data on "%s"', Model._name)
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
    Model._pending.push(new Promise(function (resolve, reject) {
      getTagOperation(Model).then(function (tag_changes) {
        Model._stash.tags = tag_changes
        resolve()
      }).catch(function (error) {
        delete Model._stash.tags
        Modely.log.error('An error occured while trying to process the tagging information for "%s"', Model._name)
        Modely.log.error(error)
      })
    }))
  }
}

function onSave(Model) {
  if (Model._schema.taggable && typeof Model._stash.tags !== 'undefined') {
    var tags = Model._stash.tags
    var model_id = Model[Model._primary_key]
    var model_name = Model._name
    
    // Delete removed tags from tag mappings table
    tags.remove.forEach(function (tag) {
      Model._pending_transactions.push(Model.
        _trx('tag_mapping')
        .where('tag_mapping_tag_id', tag.id)
        .where('tag_mapping_tag_model_id', model_id))
        .where('tag_mapping_model_name', model_name)
        .del()
    })
    
    // Create tags needed and add mappings
    tags.create.forEach(function (tag) {
      Model._pending_transactions.push(
        Model._trx.insert({
          tag_label: tag.label,
          tag_name: _.slugify(tag.label)
        }, 'tag_id').into('tag').then(function (insert_result) {
          Model._trx.insert({
            tag_mapping_model_name: model_name,
            tag_mapping_model_id: model_id,
            tag_mapping_tag_id: insert_result[0]
          }).into('tag_mapping')
        })
        )
    })
    var mappings_to_add = []
    
    // Build array or remaining tags to be added
    tags.add.forEach(function (tag) {
      if (typeof tag.id !== 'undefined') {
        mappings_to_add.push({
          tag_mapping_model_name: model_name,
          tag_mapping_model_id: model_id,
          tag_mapping_tag_id: tag.id
        })
      }
    })
    
    // Add them to the pending transations 
    if (mappings_to_add.length > 0) {
      Model._pending_transactions.push(Model._trx.insert(mappings_to_add).into('tag_mapping'))
    }
  }
}

/**
 * Processes the tags to determine which tags to add, remove or create.
 */
function getTagOperation(Model) {
  return new Promise(function (resolve, reject) {
    if (Model._action === 'create') {
      assignTagDefaults(Model)
    }
    var original_tags = Model._data.original._meta.tags || []
    var current_tags = Model._data.values._meta.tags || []
    var remove_tags = parseOriginalTags(original_tags, current_tags)
    var add_tags = parseCurrentTags(current_tags, original_tags)
    parseTagsToAdd(add_tags).then(function (create_tags) {
      resolve({
        create: create_tags || [],
        remove: remove_tags,
        add: add_tags
      })
    }).catch(function (result) {
      resolve({
        create: [],
        remove: [],
        add: []
      })
    })
  })
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
function parseOriginalTags(original_tags, current_tags) {
  var result = []
  original_tags.forEach(function (tag) {
    if (!_.findWhere(current_tags, tag)) {
      result.push(tag)
    }
  })
  return result
}

/** 
 * Parses the currently assigned tags to see which need to be added 
 */
function parseCurrentTags(current_tags, original_tags) {
  var result = []
  current_tags.forEach(function (tag) {
    if (!_.findWhere(original_tags, tag)) {
      result.push(tag)
    }
  })
  return result
}

/**
 * Parses the tags to add to the Model and see if any need to be created
 */
function parseTagsToAdd(tags) {
  return new Promise(function (resolve, reject) {
    var result = []
    async.each(
      tags,
      function iterator(tag, callback) {
        if (typeof tag.id === 'undefined' || tag.id <= 0) {
          tag.name = _.slugify(tag.label)
          Modely.knex.raw("SELECT * FROM tag WHERE tag_name = ?", [tag.name])
            .then(function (query_results) {
              if (query_results.rows.length > 0) {
                tag.id = query_results.rows[0].tag_id
                return callback()
              } else {
                result.push(tag)
                return callback()
              }
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

module.exports = function tagging(modely_reference) {
  
  // Reference to Model
  Modely = modely_reference
  
  // Register the models required for tagging
  registerModels()
  // Register events
  Modely.on('Model:*:BeforeLoad', beforeLoad)
  Modely.on('Model:*:AfterLoad', afterLoad)
  Modely.on('Model:*:BeforeSave', beforeSave)
  Modely.on('Model:*:OnSave', onSave)
  Modely.on('Model:*:OnDelete', onDelete)
  Modely.on('Model:tag:BeforeSave', function(Model){
    
  })
}