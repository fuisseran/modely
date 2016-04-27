// NOTE: This could be moved to extensions
var Modely
var fs = require('fs')
var Promise = require('bluebird')
var async = require('async')
var files = fs.readdirSync(__dirname)
var types = {}



function processRelationship(Model, args) {
  if (typeof types[args.type] === 'undefined') {
    Modely.log.warn('Unknown relationship type specified' + Model._name)
  } else {
    types[args.type](Model.prototype._name, args)
  }
  if (typeof Modely.relationships[Model.prototype._name] === 'undefined') {
    Modely.relationships[Model.prototype._name] = {}
  }
}

function Relationships() {
  // TODO: needs to handle everything
}

Relationships.prototype.parseRelationships = function parseRelationships() {
  return new Promise(function (resolve) {
    async.eachSeries(Modely.models, function (Model, callback) {
      if (Model.prototype._relationships.length > 0) {
        async.eachSeries(Model.prototype._relationships,
        function (relationshipArgs, relationshipCallback) {
          processRelationship(Model, relationshipArgs)
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


module.exports = function (modelyReference) {
  Modely = modelyReference
  files.forEach(function (file) {
    var name
    if (file !== 'index.js' && file !== 'common.js') {
      name = file.replace('.js', '')
      types[name] = require('./' + name)(Modely)
    }
  })
  return new Relationships()
}
