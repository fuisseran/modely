// relationships
var Modely
var fs = require('fs')
var Promise = require('bluebird')
var async = require('async')

module.exports = function(modely_reference) {
  Modely = modely_reference
  files.forEach(function(file) {
    if (file !== 'index.js') {
      var name = file.replace('.js', '')
      types[name] = require('./' + name)(Modely)
    }
  })
  return parseRelationships
}
// load relationship types
var files = fs.readdirSync(__dirname)

var types = {}


function parseRelationships() {
  return new Promise(function(resolve, reject) {
    async.eachSeries(Modely.models, function(Model, callback) {
      if (Model.prototype._relationships.length > 0) {
        async.eachSeries(Model.prototype._relationships, function(relationship_args, relationship_callback) {
          processRelationship(Model, relationship_args)
        }, callback.apply(callback, null))
      } else {
        callback(null)
      }
    }, function done(err, results) {
      return resolve()
    })

  })
}

function processRelationship(Model, args) {
  if (typeof types[args.type] === 'undefined') {
    Modely.log.warn('Unknown relationship type specified' + Model._name)
  } else {
    var rel = types[args.type](Model.prototype._name, args)
  }
  if (typeof Modely.relationships[Model.prototype._name] === 'undefined') {
    Modely.relationships[Model.prototype._name] = {}
  }
}

