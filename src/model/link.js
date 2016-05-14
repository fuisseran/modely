var Promise = require('bluebird')
var Modely = require('../index')

function validateArgs(sourceModel, targetModel, targetId) {
  return new Promise(function (resolve, reject) {
    if (typeof targetModel === 'undefined') {
      return reject('MissingTargetModel')
    }
    if (typeof targetId === 'undefined') {
      return reject('MissingTargetId')
    }
    if (typeof Modely.relationships[sourceModel._name][targetModel] === 'undefined') {
      return reject('NoRelationship')
    }
    if (typeof sourceModel[sourceModel._primary_key === 'undefined']) {
      return reject('MissingSourceId')
    }
    return resolve(sourceModel, targetModel, targetId)
  })
}

function loadTargetModel(sourceModel, targetModel, targetId) {
  return new Promise(function (resolve, reject) {
    var instance
    if (typeof targetModel === 'string') {
      instance = new Modely.models[targetModel](sourceModel.$user)
      return instance.$read(targetId).catch(reject).then(function () {
        return resolve(sourceModel, instance)
      })
    }
    return resolve(sourceModel, targetModel)
  })
}

function link(model, id) {
  var modelInstance = this
  var isModel = typeof model === 'object'
  var targetModel = isModel ? model._name : model
  var targetId = isModel ? model[model._primary_key] : id
  return new Promise(function (resolve, reject) {
    validateArgs(modelInstance, targetModel, targetId)
    .catch(reject)
    .then(loadTargetModel)
    .catch(reject)
    .then(function (source, target) {
      var relationship = Modely.relationships[source._name][target._name]
      if (typeof relationship._link === 'function') {
        return relationship._link(source, target)
        .catch(reject)
        .then(resolve)
      }
      return resolve()
    })
  })
}

module.exports = link
