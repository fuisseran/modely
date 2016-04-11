function apply_core_properties(Model, name, properties) {
  var props = [
    //
    
    ['_data', {                       /* Holds the values assigned to the model */
      original: { _meta: {} },
      values: { _meta: {} }
    }],
    ['_action', null],                /* Current action being taken on the model */
    ['_data_object', null],
    ['$user', null],                  /* Current user accessing the model */
    ['_trx', null],                   /* Current transation of the model */
    ['_status', 'new'],               /* Status of the current model */
    ['_pending_transactions', []],    /* Pending transaction during main transaction operation */
    ['_pending', []],                 /* Pending operations to be performed on the model */
    ['_query', null],                 /* Current query being built */
    ['_row_cache', null],             /* Current row being processed */
    ['_stash', {}],                   /* Universal location for extensions to store data during operations */
  ]

  props.forEach(function (item, index, _array) {
    Object.defineProperty(Model, item[0].toString(), {
      configurable: false,
      enumerable: false,
      writable: true,
      value: item[1]
    })
  })
}

function inherits(child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      enumerable: false,
      configurable: true,
      writable: true,
      value: child
    }
  })
  child.prototype.super_ = parent;
}

module.exports = {
  apply_core_properties: apply_core_properties,
  inherits : inherits
}