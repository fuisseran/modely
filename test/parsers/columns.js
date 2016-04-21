var chai = require('chai')
var should = chai.should()
var expect = chai.expect
var parsers = require('../../src/parsers')
var testColumnData = {
  integer_test: {
    integer_test: 'integer'
  },
  string_test: {
    string_test: 'string(200)'
  },
  bigint_test: {
    bigint_test: 'biginteger'
  },
  text_test: {
    text_test: 'text'
  },
  float_test: {
    float_test: 'float'
  },
  decimal_test: {
    decimal_test: 'decimal'
  },
  boolean_test: {
    boolean_test: 'boolean'
  },
  date_test: {
    date_test: 'date'
  },
  datetime_test: {
    datetime_test: 'datetime'
  },
  time_test: {
    time_test: 'time'
  },
  timestamp_test: {
    timestamp_test: 'timestamp'
  },
  binary_test: {
    binary_test: 'binary'
  },
  json_test: {
    json_test: 'json'
  },
  uuid_test: {
    uuid_test: 'uuid'
  },
  primary_key_test: {
    primary_key_test: 'integer primary key'
  },
  auto_increment_test: {
    auto_increment_test: 'integer auto increment'
  },
  unique_test: {
    unique_test: 'string unique'
  },
  not_null_test: {
    not_null_test: 'string not null'
  }
}

function getTestModel() {
  function Model() {}
  Object.defineProperty(Model.prototype, '_name', { value: 'test' })
  Object.defineProperty(Model.prototype, '_defaults', { value: {} })
  return Model
}



describe('parsers.columns', function () {
  it('Parse integer column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.integer_test)
    should.exist(Model.prototype._columns.integer_test)
    expect(Model.prototype._columns.integer_test.type).to.be.equal('integer')
  })
  it('Parse string column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.string_test)
    should.exist(Model.prototype._columns.string_test)
    expect(Model.prototype._columns.string_test.type).to.be.equal('string')
    expect(Model.prototype._columns.string_test.size).to.be.equal(200)
  })
  it('Parse biginteger column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.bigint_test)
    should.exist(Model.prototype._columns.bigint_test)
    expect(Model.prototype._columns.bigint_test.type).to.be.equal('biginteger')
  })
  it('Parse text column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.text_test)
    should.exist(Model.prototype._columns.text_test)
    expect(Model.prototype._columns.text_test.type).to.be.equal('text')
  })
  it('Parse float column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.float_test)
    should.exist(Model.prototype._columns.float_test)
    expect(Model.prototype._columns.float_test.type).to.be.equal('float')
  })
  it('Parse decimal column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.decimal_test)
    should.exist(Model.prototype._columns.decimal_test)
    expect(Model.prototype._columns.decimal_test.type).to.be.equal('decimal')
  })
  it('Parse boolean column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.boolean_test)
    should.exist(Model.prototype._columns.boolean_test)
    expect(Model.prototype._columns.boolean_test.type).to.be.equal('boolean')
  })
  it('Parse date column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.date_test)
    should.exist(Model.prototype._columns.date_test)
    expect(Model.prototype._columns.date_test.type).to.be.equal('date')
  })
  it('Parse datetime column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.datetime_test)
    should.exist(Model.prototype._columns.datetime_test)
    expect(Model.prototype._columns.datetime_test.type).to.be.equal('datetime')
  })
  it('Parse time column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.time_test)
    should.exist(Model.prototype._columns.time_test)
    expect(Model.prototype._columns.time_test.type).to.be.equal('time')
  })
  it('Parse timestamp column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.timestamp_test)
    should.exist(Model.prototype._columns.timestamp_test)
    expect(Model.prototype._columns.timestamp_test.type).to.be.equal('timestamp')
  })
  it('Parse binary column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.binary_test)
    should.exist(Model.prototype._columns.binary_test)
    expect(Model.prototype._columns.binary_test.type).to.be.equal('binary')
  })
  it('Parse json column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.json_test)
    should.exist(Model.prototype._columns.json_test)
    expect(Model.prototype._columns.json_test.type).to.be.equal('json')
  })
  it('Parse uuid column', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.uuid_test)
    should.exist(Model.prototype._columns.uuid_test)
    expect(Model.prototype._columns.uuid_test.type).to.be.equal('uuid')
  })
  it('Check primary key assignment', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.primary_key_test)
    should.exist(Model.prototype._columns.primary_key_test)
    expect(Model.prototype._columns.primary_key_test.primary_key).to.be.equal(true)
  })
  it('Check auto increment assignment', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.auto_increment_test)
    should.exist(Model.prototype._columns.auto_increment_test)
    expect(Model.prototype._columns.auto_increment_test.auto).to.be.equal(true)
  })
  it('Check unique assignment', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.unique_test)
    should.exist(Model.prototype._columns.unique_test)
    expect(Model.prototype._columns.unique_test.unique).to.be.equal(true)
  })
  it('Check not null assignment', function () {
    var Model = getTestModel()
    parsers.columns(Model, testColumnData.not_null_test)
    should.exist(Model.prototype._columns.not_null_test)
    expect(Model.prototype._columns.not_null_test.not_null).to.be.equal(true)
  })
})
