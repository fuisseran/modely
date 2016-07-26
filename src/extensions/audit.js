// TODO: Convert audit into an extension
var Modely

function auditColumns(modelName) { 
  return {
    created_by: {
      name: modelName + '_created_by',
      full_name: modelName + '.' + modelName + '_created_by',
      label: 'Created By',
      type: 'integer',
      not_null: true,
      default: 0
    },
    created_on: {
      name: modelName + '_created_on',
      full_name: modelName + '.' + modelName + '_created_on',
      type: 'datetime',
      label: 'Created On',
      not_null: true,
      default: new Date().toISOString()
    },
    modified_by: {
      name: modelName + '_modified_by',
      full_name: modelName + '.' + modelName + '_modified_by',
      label: 'Modified By',
      type: 'integer',
      not_null: true,
      default: 0
    },
    modified_on: {
      name: modelName + '_modified_on',
      full_name: modelName + '.' + modelName + '_modified_on',
      label: 'Modified On',
      type: 'datetime',
      not_null: true,
      default: new Date().toISOString()
    }
  }
}

function beforePropertyRead(Model) {
  var timeStamp = (new Date()).toISOString().slice(0, 19).replace('T', ' ')
  Model.modified_by = Model.$user.id
  Model.modified_on = timeStamp
  if (Model._action === 'create') {
    Model.created_by = Model.$user.id
    Model.created_on = timeStamp
  }
}

function beforeRegistration(modelName, properties) {
  var columns = auditColumns(modelName)
  if (typeof properties.taggable !== 'undefined'
  && properties.taggable === true) {
    Object.keys(columns).forEach(function (columnName) {
      properties.columns[columnName] = columns[columnName]
    })
  }
}

function afterRegistration(Model) {
  if (typeof Model.prototype._schema.taggable !== 'undefined'
  && Model.prototype._schema.taggable === true) {
    Object.defineProperty(Model.prototype, '_audit', {
      enumerable: false,
      configurable: false,
      value: true
    })
    Modely.on('Model:' + Model.prototype._name + 'BeforePropertyRead', beforePropertyRead)
  }
}
module.exports = function audit(modelyReference) {
  // Reference to Model
  Modely = modelyReference
  Modely.on('BeforeRegistration', beforeRegistration)
  Modely.on('AfterRegistration', afterRegistration)
  // Register the models required for tagging
}
