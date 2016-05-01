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
    types[args.type](Model.prototype._name, args)
  }
  if (typeof Modely.relationships[Model.prototype._name] === 'undefined') {
    Modely.relationships[Model.prototype._name] = {}
  }
}

function relationships(args) {
  // TODO: needs to handle everything
}

function parseRelationships() {
  return new Promise(function (resolve) {
    async.eachSeries(Modely.models, function (Model, callback) {
      if (Model.prototype._relationships.length > 0) {
        async.eachSeries(Model.prototype._relationships,
        function (relationshipArgs, relationshipCallback) {
          parseRelationship(Model, relationshipArgs)
          relationshipCallback(null)
        }, callback.apply(callback, null))
      } else {
        callback(null)
      }
    }, function done() {
      return resolve()
    })
  })
}

function parseModelRelationships(modelName) {
  var model = Modely.models[modelName]
  var pending = Modely.relationshipsManager.pending[modelName]
  var modified = []
  return new Promise(function (resolve, reject) {
    model.prototype._relationships.forEach(function (relationship) {
      parseRelationship(model, relationship)
    })
    if (typeof pending !== 'undefined') {
      pending.forEach(function (relationship) {
        parseRelationship(Modely.models[relationship.model], relationship.args)
      })
    }
    async.each(modified, function iterator(modelNameToUpdate, callback) {
      var modelToUpdate = new Modely.models[modelNameToUpdate]()
      modelToUpdate.$install(function () {
        callback(null)
      }).catch(function () {
        Modely.log.debug('[Modely] Failed to update "%s" model following a relationship alteration', modelNameToUpdate)
      })
    }, function done(err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)    
      }
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
  },
  parseAll: {
    enumerable: true,
    value: parseRelationships
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
