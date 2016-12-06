'use strict'

let Modely = null

function addError(errors, key, message) {
  if (errors[key] === undefined) {
    errors[key] = message
  }
}

function validateModel(model) {
  // TODO: expand this to work for as many types as possible.
  const errors = {}
  Object.keys(model._columns).forEach((key) => {
    const column = model._columns[key]
    if (column.required && (model[key] === undefined || model[key] === null)) {
      addError(errors, key, `MissingProperty:${key}`)
    }
    switch (column.type) {
      case 'string':
        if (column.size && model[key] && model[key].length && model[key].length > column.size) {
          addError(errors, key, `${key}:Can no be longer then ${column.size}`)
        }
        break
      default:
    }
  })
  if (Object.keys(errors).length > 0) {
    throw new Error(errors.join(', '))
  }
}

module.exports = function (ref) {
  Modely = ref
  Modely.on('Model:*:BeforeSave', validateModel)
}
