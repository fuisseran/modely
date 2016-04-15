/**
 * Parses a string that defines a column
 * @param {Object} Model - refence to BossModel
 * @param {String} columnName - name of the column
 * @param {String} colum - column data in string format
 * @return {Object}  returns object containing the required information for the property
 */
function parseColumnString(Model, columnName, column) {
  var properties = {
    not_null: false,
    primary_key: false,
    auto: false,
    model_name: Model.prototype._name
  }
  var rx = {
    type: /^([^(^ ]+)\s*/,
    size: /^\((\d+)\)\s*/,
    typeText: /^\((\w+)\)\s*/,
    not_null: /\bnot[_ ]null\b/i,
    primary_key: /\bprimary key\b/i,
    auto: /\bauto[_ ]increment\b/i,
    unique: /\bunique\b/i,
    index: /\bindex\b/
  }
  var $1
  // Get column type
  if ($1 = rx.type.exec(column)) {
    properties.type = $1[1].toLowerCase()
  }
  // Check the property type is valid
  if (['integer', 'biginteger', 'string', 'text', 'float', 'decimal', 'boolean', 'date',
  'datetime', 'time', 'timestamp', 'binary', 'json', 'uuid'].indexOf(properties.type)
  === -1) {
    throw new Error("Invalid column type '" + properties.type + "' found for column '" +
    columnName + "' in model '" + Model.name)
  }
  // Remove match from string
  column = column.replace(rx.type, '')
  // Get column size
  if ($1 = rx.size.exec(column)) {
    properties.size = parseInt($1[1], 10)
  }
  // Remove match from string
  column = column.replace(rx.size, '')
  // Get typeText
  if ($1 = rx.typeText.exec(column)) {
    properties.typeText = $1[1]
  }
  // Remove match from string
  column = column.replace(rx.typeText, '')
  // Check for "not null"
  if (rx.not_null.exec(column)) {
    properties.not_null = true
  }
  if (rx.index.exec(column)) {
    Model._prototype._indexes.push(columnName)
  }
  // Check to see if the column is the primary key
  if (rx.primary_key.exec(column) || columnName === Model._primary_key) {
    properties.primary_key = true
  }
  // Check to see if the column auto increments
  if (rx.auto.exec(column)) {
    properties.auto = true
  }
  // Check to see it the column is unique
  if (rx.unique.exec(column)) {
    properties.unique = true
  }
  // Check for default values for field if there are any
  if (typeof Model.prototype._defaults[columnName] !== 'undefined') {
    properties.default = Model.prototype._defaults[columnName]
  }
  return properties
}

module.exports = function (Model, columns) {
  var modelName = Model.prototype._name
  if (typeof columns === 'object' && Object.keys(columns).length > 0) {
    // Check if the Model already has a _columns property
    if (typeof Model.prototype._columns === 'undefined') {
      Object.defineProperty(Model.prototype, '_columns', {
        enumerable: false,
        value: {}
      })
    }
    // Loop through the columns
    Object.keys(columns).forEach(function (propertyName) {
      var column = columns[propertyName]
      // check if hte column is a string that needs parsing
      if (typeof column === 'string') {
        column = parseColumnString(Model, propertyName, column)
      }
      // column name
      column.name = modelName + '_' + propertyName
      // table + column name
      column.full_name = modelName + '.' + modelName + '_' + propertyName
      // add the properties to the _columns property
      Object.defineProperty(Model.prototype._columns, propertyName, {
        enumerable: true,
        value: column
      })
      // if the column is the primary key then add it to the Model
      if (column.primary_key) {
        Object.defineProperty(Model.prototype, '_primary_key', {
          enumerable: false,
          value: propertyName
        })
      }
    })
  }
}
