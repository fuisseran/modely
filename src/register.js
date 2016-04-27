var parsers = require('./parsers')
var common = require('./common')

function register(name, properties) {
  // Reference to Modely
  var Modely = this
  var prototypeProperties
  // Check that parameters have been defined
  if (!name || !properties) {
    throw new Error('InvalidParamters')
  }
  // Normalise the model name needs to be looked at again
  // name = name
  // Emit event for before model registration
  Modely.emit('beforeRegistration', name, properties)
  // process the model properties
  if (typeof Modely.models[name] === 'undefined') {
    // Create model generator function
    Modely.models[name] = function (user) {
      // Check the model name is not already registered
      if (!(this instanceof Modely.models[name])) {
        return new Modely.models[name](user)
      }
      // Set the core properties of the Model
      common.apply_core_properties(this, name, properties)
      // Assign user object to the model
      this.$user = user
      this.super_()
    }
    // Assign name to the model
    Object.defineProperties(Modely.models[name].prototype, {
      _name: {
        enumerable: false,
        value: name
      }
    })
    Object.defineProperty(Modely.models[name].prototype.constructor, 'name', {
      value: name
    })
    // Inherit from the base Model
    common.inherits(Modely.models[name], Modely.BaseModel)
    // Parse the column data
    prototypeProperties = [
      ['_name', name],                                                   /* Name of the model */
      ['_version', properties.version],                                      /* Model version */
      ['_schema', properties],            /* The original properties used to define the model */
      ['_defaults', properties.defaults || {}],              /* Column defaults for the model */
      ['_indexes', properties.indexes || []],      /* Array of indexes defaults for the model */
      ['_relationships', properties.relationships || []],      /* Relationships of the object */
      ['_data_object', null],   /* Object to use in db transaction for inserting and updating */
      ['_row_cache', null]                                      /* Used to store raw row data */
    ]
    // Assign the prototype properties
    prototypeProperties.forEach(function (item) {
      Object.defineProperty(Modely.models[name].prototype, item[0], {
        enumerable: false,
        writable: false,
        configurable: false,
        value: item[1]
      })
    })
    // Parse the columns
    parsers.columns(Modely.models[name], properties.columns)
    // Parse audit data
    parsers.audit(Modely.models[name], properties.audit)
    // Define the Properties of the model.
    Modely.emit('afterRegistration', Modely.models[name])
    this.log.debug('[Modely] Registered "' + name + '" model')
  } else {
    this.log.debug('[Modely] "' + name + '" is already registered')
  }
}

module.exports = register
