var _ = require('underscore')
var slugify = require('underscore.string/slugify')
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
  tagmap: {
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
  originalTags.forEach(tag => {
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
  currentTags.forEach(tag => {
    if (originalTags.every((oTag) => tag.id !== oTag.id)) {
      result.push(tag)
    }
  })
  return result
}

/**
 * Parses the tags to add to the Model and see if any need to be created
 */
function parseTagsToAdd(tags) {
  return new Promise(resolve => {
    Promise.map(tags, tag => {
      if (typeof tag.id === 'undefined' || tag.id <= 0) {
        tag.name = slugify(tag.label)
        return Modely.knex.raw('SELECT * FROM tag WHERE tag_name = ?', [tag.name])
        .then(queryResults => {
          if (queryResults.rows.length > 0) {
            tag.id = queryResults.rows[0].tag_id
            return null
          }
          return tag
        }).catch(Modely.log.error)
      }
    })
    .then(tagsToAdd => { resolve(tagsToAdd.filter(element => { return element })) })
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
  return new Promise(resolve => {
    if (Model._action === 'create') {
      assignTagDefaults(Model)
    }
    originalTags = Model._data.original._meta.tags || []
    currentTags = Model._data.values._meta.tags || []
    removeTags = parseOriginalTags(originalTags, currentTags)
    addTags = parseCurrentTags(currentTags, originalTags)
    parseTagsToAdd(addTags).then(createTags => {
      resolve({
        create: createTags.filter(tag => {
          return typeof tag.id !== 'undefined' && tag.id > 0 ? null : tag
        }) || [],
        remove: removeTags,
        add: addTags.filter(tag => { 
          return typeof tag.id !== 'undefined' && tag.id > 0 ? tag : null
        })
      })
    }).catch(() => {
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
  Object.keys(models).forEach(modelName => { Modely.register(modelName, models[modelName]) })
}

/**
 * Removes the tag mappings when the model is deleted
 */
function onDelete(Model) {
  if (Model._schema.taggable) {
    Model._pending_transactions.push(Model
      ._trx('tagmap')
      .where('tagmap_model_id', Model[Model._primary_key])
      .where('tagmap_model_name', Model._name)
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
    '\')), \',\')||\']\' FROM tag LEFT JOIN tagmap ON tag.tag_id = tagmap_tag_id ' +
    'WHERE tagmap_model_id = ? AND tagmap_model_name=?) as tags',
    [Model[Model._primary_key], Model._name]))
  }
}

function beforeSearch(Model, params) {
  if (Model._schema.taggable) {
    Model._query.select(Modely.knex.raw('(SELECT \'[\' || array_to_string( array_agg(' +
    '(\'{"id":\' || tag_id ||\',"label":"\'||tag_label||\'","name":"\'||tag_name||\'"}' +
    '\')), \',\')||\']\' FROM tag LEFT JOIN tagmap ON tag.tag_id = tagmap_tag_id ' +
    'WHERE tagmap_model_id = ' + Model._columns[Model._primary_key].full_name + ' AND tagmap_model_name= ?) as tags',
    [Model._name]))
  }
}

function searchParse(Model, data, row) {
  if (Model._schema.taggable) {
    if (typeof row.tags !== 'undefined' && row.tags !== null) {
      try {
        data._meta.tags = JSON.parse(row.tags.replace(/\\/g, '\\\\'))
      } catch (err) {
        Modely.log.error('[MODELY] An error occured will trying to parse the tagging data on "%s"',
        Model._name)
        Modely.log.error(err)
        Modely.log.error(row.tags)
      }
      delete row.tags
    } else if (row.tags === null) {
      data._meta.tags = []
    }
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
        Modely.log.error(err)
        Modely.log.error(row.tags)
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
    Model._pending.push(new Promise(resolve => {
      getTagOperation(Model).then(tagChanges => {
        Model._stash.tags = tagChanges
        resolve()
      }).catch(error => {
        delete Model._stash.tags
        Modely.log.error('An error occured while trying to process the tagging information for ' +
        '"%s"', Model._name)
        Modely.log.error(error)
      })
    }))
  }
  if (!Model._schema.taggable && Model._data.values._meta.tags !== undefined &&
  Model._data.values._meta.tags.length > 0) {
    Modely.log.debug('Tagging data found on a non taggable model: "%s"', Model._name)
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
    tags.remove.forEach(tag => {
      Model._pending_transactions.push(Model.
        _trx('tagmap')
        .where('tagmap_tag_id', tag.id)
        .where('tagmap_model_id', modelId)
        .where('tagmap_model_name', modelName)
        .del())
    })
    // Create tags needed and add mappings
    tags.create.forEach(tag => {
      Model._pending_transactions.push(
        Model._trx.insert({
          tag_label: tag.label,
          tag_name: slugify(tag.label)
        }, 'tag_id').into('tag').then(insertResult => {
          return Model._trx.insert({
            tagmap_model_name: modelName,
            tagmap_model_id: modelId,
            tagmap_tag_id: insertResult[0]
          }).into('tagmap')
        })
        )
    })
    // Build array or remaining tags to be added
    tags.add.forEach(tag => {
      if (typeof tag.id !== 'undefined' && tag.id > 0) {
        mappingsToAdd.push({
          tagmap_model_name: modelName,
          tagmap_model_id: modelId,
          tagmap_tag_id: tag.id
        })
      }
    })
    // Add them to the pending transactions
    if (mappingsToAdd.length > 0) {
      Model._pending_transactions.push(Model._trx.insert(mappingsToAdd).into('tagmap'))
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
  // Register events these shoudl ony be registered on models that can have taggable = true
  Modely.on('Model:*:BeforeLoad', beforeLoad)
  Modely.on('Model:*:AfterLoad', afterLoad)
  Modely.on('Model:*:BeforeSave', beforeSave)
  Modely.on('Model:*:OnSave', onSave)
  Modely.on('Model:*:OnDelete', onDelete)
  Modely.on('Model:*:BeforeSearch', beforeSearch)
  Modely.on('Model:*:BeforeSearchRowParse', searchParse)
  Modely.on('afterRegistration', onRegister)
  Modely.on('Model:tag:BeforeSave', Model => { return Model })
}
