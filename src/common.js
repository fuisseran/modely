function applyCoreProperties(Model) {
  var props = [
    ['_data', {                                        /* Holds the values assigned to the model */
      original: { _meta: {} },
      values: { _meta: {} }
    }],
    ['_action', null],                                /* Current action being taken on the model */
    ['_data_object', null],
    ['$user', null],                                         /* Current user accessing the model */
    ['_trx', null],                                           /* Current transation of the model */
    ['_status', 'new'],                                           /* Status of the current model */
    ['_pending_transactions', []],      /* Pending transaction during main transaction operation */
    ['_pending', []],                         /* Pending operations to be performed on the model */
    ['_query', null],                                               /* Current query being built */
    ['_row_cache', null],                                         /* Current row being processed */
    ['_stash', {}],         /* Universal location for extensions to store data during operations */
    ['_trxData', null]
  ]

  props.forEach(function (item) {
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
  child.prototype.super_ = parent
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
    if (+match === 0) return '' // or if (/\s+/.test(match)) for white spaces
    return index === 0 ? match.toLowerCase() : match.toUpperCase()
  })
}

function LoggerQueue() {
  var self = this
  var types = ['warn', 'info', 'debug', 'error']
  self.queued = []
  types.forEach(function (type) {
    self[type] = function () {
      self.queued.push({
        type: type,
        args: arguments
      })
    }
  })
  self.processLog = function (logger) {
    self.queued.forEach(function (queueItem) {
      logger[queueItem.type].apply(this, queueItem.args)
    })
  }
}

module.exports = {
  apply_core_properties: applyCoreProperties,
  inherits: inherits,
  camelize: camelize,
  LoggerQueue: LoggerQueue
}
