var Promise = require('bluebird')
var Modely = require('../index')

function validateArgs(args) {
  return new Promise(function (resolve, reject) {
    if (typeof args.targetModelName === 'undefined') {
      return reject('MissingTargetModel')
    }
    if (typeof args.targetModelId === 'undefined') {
      return reject('MissingTargetId')
    }
    if (typeof Modely.relationships[args.sourceModel._name][args.targetModelName] === 'undefined') {
      return reject('NoRelationship')
    }
    if (typeof args.sourceModel[args.sourceModel._primary_key] === 'undefined') {
      return reject('MissingSourceId')
    }
    return resolve(args)
  })
}

function loadTargetModel(args) {
  return new Promise(function (resolve, reject) {
    if (args.targetModel === null) {
      args.targetModel = new Modely.models[args.targetModelName](args.sourceModel.$user)
      return args.targetModel.$read(args.targetModelId)
        .catch(reject)
        .then(() => { return resolve(args) })
    }
    return resolve(args)
  })
}

function unlink(model, id) {
  var modelInstance = this
  var isModel = typeof model === 'object'
  var args = {
    sourceModel: modelInstance,
    targetModel: isModel ? model : null,
    targetModelName: isModel ? model._name : model,
    targetModelId: isModel ? model[model._primary_key] : id
  }
  return new Promise(function (resolve, reject) {
    validateArgs(args)
    .catch(reject)
    .then(loadTargetModel)
    .catch(reject)
    .then(function (processedArgs) {
      var relationship = Modely.relationships[processedArgs.sourceModel._name][processedArgs
      .targetModel._name]
      var fn = null
      switch (relationship.type) {
        case 'many-to-many':
          fn = Modely.relationshipsManager.types['many-to-many']._unlink
          break
        default:
      }
      if (typeof fn === 'function') {
        return fn(processedArgs.sourceModel, processedArgs.targetModel)
        .catch(reject)
        .then(resolve)
      }
      return resolve()
    })
  })
}

module.exports = unlink
