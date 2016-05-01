// NOTE: This could be moved to extensions
var Modely
var fs = require('fs')
var Promise = require('bluebird')
var async = require('async')
var files = fs.readdirSync(__dirname)
var types = {}


function parseRelationship(Model, args) {
  if (typeof types[args.type] === 'undefined') {
    Modely.log.warn('Unknown relationship type specified' + Model._name)
  } else {
    return types[args.type](Model.prototype._name, args)
  }
  if (typeof Modely.relationships[Model.prototype._name] === 'undefined') {
    Modely.relationships[Model.prototype._name] = {}
  }
}

function relationships(args) {
  // TODO: needs to handle everything
}

function processModelRelationships(args) {
  var model = args.model
  var modelRelationships = model.prototype._relationships
  return new Promise(function (resolve, reject) {
    async.each(modelRelationships, function relationshipIterator(relationship,
    callback) {
      var modified = parseRelationship(model, relationship)
      if (Array.isArray(modified) && modified.length > 0) {
        args.modified.concat(modified)
      }
      callback(null)
    }, function done(err) {
      if (err) {
        return reject(err)
      }
      return resolve(args)
    })
  })
}

function processPendingRelationships(args) {
  return new Promise(function (resolve, reject) {
    async.each(args.pending, function pendingIterator(relationship, callback) {
      var modified = parseRelationship(Modely.models[relationship.model], relationship.args)
      if (Array.isArray(modified) && modified.length > 0) {
        args.modified = args.modified.concat(modified)
      }
      callback(null)
    }, function done(err) {
      if (err) {
        return reject(err)
      }
      return resolve(args)
    })
  })
}

function updateModels(modelName, callback) {
  var modelToUpdate = new Modely.models[modelName]()
  return modelToUpdate.$install().then(function () {
    callback(null)
  }).catch(function () {
    callback(null)
    Modely.log.debug('[Modely] Failed to update "%s" model following a relationship ' +
    'alteration', modelName)
  })
}

function processModified(parseArgs) {
  return new Promise(function (resolve, reject) {
    async.each(parseArgs.modified, updateModels, function done(err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

function parseModelRelationships(modelName) {
  var parseArgs = {
    model: Modely.models[modelName],
    pending: Modely.relationshipsManager.pending[modelName] || [],
    modified: []
  }
  return new Promise(function (resolve, reject) {
    return processModelRelationships(parseArgs)
    .then(processPendingRelationships)
    .then(processModified)
    .then(resolve)
    .catch(function (err) {
      reject(err)
    })
    // need to check if any models have been changed and call install on those models again
  })
}

Object.defineProperties(relationships, {
  types: {
    enumerable: true,
    value: types
  },
  relationships: {
    enumerable: true,
    value: {}
  },
  pending: {
    enumerable: true,
    value: {}
  },
  parse: {
    enumerable: true,
    value: parseModelRelationships
  }
})

module.exports = function (modelyReference) {
  Modely = modelyReference
  files.forEach(function (file) {
    var name
    if (file !== 'index.js' && file !== 'common.js') {
      name = file.replace('.js', '')
      types[name] = require('./' + name)(Modely)
    }
  })
  return relationships
}
