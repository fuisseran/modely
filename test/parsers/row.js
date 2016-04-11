var chai = require('chai')
var parsers = require('../../src/parsers')
var Model = {
  _row_cache:{
    column1:'value1',
    column2:'value2',
    column3:'value3',
    auditcolumn:'audit_test'
  },
  _columns:{
    column1:{},
    column2:{}
  },
  _data:{
    original:{}
  },
  _audit : {
    auditcolumn:'audit_test'
  }
}

describe('parsers.row', function(){
  parsers.row(Model)
  it('Should assign known columns as original value', function(){
    chai.expect(Model._data.original.column1).to.be.equal(Model._row_cache.column1)
    chai.expect(Model._data.original.column2).to.be.equal(Model._row_cache.column2)
  })
  it('Does not assign unknown column to the Model', function(){
    chai.should().not.exist(Model._data.original.column3)
  })
  it('Should assign audit information to the Model', function(){
    chai.expect(Model._data.original.auditcolumn).to.be.equal(Model._row_cache.auditcolumn)
  })
})