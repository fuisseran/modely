function save() {
  var model = this
  var args = arguments
  var primaryKey = model._primary_key
  if ((typeof model[primaryKey] !== 'undefined' &&
  model[primaryKey] > 0) || typeof args[0][primaryKey] !== 'undefined') {
    return model.$update.apply(model, args)
  }
  return model.$create.apply(model, args)
}

module.exports = save
