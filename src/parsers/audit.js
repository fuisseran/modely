module.exports = function (Model, audit) {
  var auditValue = null
  var tblName = Model.prototype._name
  var now = (new Date()).toISOString().slice(0, 19).replace('T', ' ')
  if (typeof audit !== 'undefined' && audit === true) {
    auditValue = {
      created_by: {
        name: tblName + '_created_by',
        full_name: tblName + '.' + tblName + '_created_by',
        type: 'integer',
        not_null: true
      },
      created_on: {
        name: tblName + '_created_on',
        full_name: tblName + '.' + tblName + '_created_on',
        type: 'datetime',
        not_null: true,
        default: now
      },
      modified_by: {
        name: tblName + '_modified_by',
        full_name: tblName + '.' + tblName + '_modified_by',
        type: 'integer',
        not_null: true
      },
      modified_on: {
        name: tblName + '_modified_on',
        full_name: tblName + '.' + tblName + '_modified_on',
        type: 'datetime',
        not_null: true,
        default: now
      }
    }
  }
  Object.defineProperty(Model.prototype, '_audit', {
    enumerable: false,
    writable: false,
    value: auditValue
  })
}
