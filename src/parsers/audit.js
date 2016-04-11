module.exports = function(Model, audit){
  var audit_value = null
  if(typeof audit != 'undefined' && audit === true){
    var tbl_name = Model.prototype._name 
    var now = (new Date()).toISOString().slice(0, 19).replace('T', ' ')
    audit_value = {
      created_by : {
        name: tbl_name + '_created_by',
        full_name: tbl_name +'.' + tbl_name + '_created_by',
        type: 'integer', 
        not_null : true
      },
      created_on : {
        name: tbl_name + '_created_on',
        full_name: tbl_name + '.' + tbl_name + '_created_on',
        type: 'datetime', 
        not_null : true,
        'default': now
      },
      modified_by : {
        name: tbl_name + '_modified_by',
        full_name: tbl_name + '.' + tbl_name + '_modified_by',
        type: 'integer', 
        not_null : true
      },
      modified_on : {
        name: tbl_name + '_modified_on',
        full_name: tbl_name + '.' + tbl_name + '_modified_on',
        type: 'datetime', 
        not_null : true, 
        'default' : now
      }
    }
  } 
  Object.defineProperty(Model.prototype, '_audit',{
    enumerable : false,
    writable : false,
    value : audit_value
  })
}