var chai = require('chai')
var should = chai.should()
var expect = chai.expect
var assert = chai.assert
var parsers = require('../../src/parsers')

function audit_model(){}
Object.defineProperty(audit_model.prototype, '_name',{value:'test'})

function no_audit_model(){}
Object.defineProperty(no_audit_model.prototype, '_name',{value:'test'})

describe('parsers.audit', function(){
  it('Should apply audit properties', function(){
    parsers.audit(audit_model, true)
    
    // Check properties exist
    should.exist(audit_model.prototype._audit.created_by)
    should.exist(audit_model.prototype._audit.created_on)
    should.exist(audit_model.prototype._audit.modified_by)
    should.exist(audit_model.prototype._audit.modified_on)
    
    // Short cut to properties
    var audit = audit_model.prototype._audit
    
    // Check column names
    expect(audit.created_by.name).to.be.equal('test_created_by')
    expect(audit.created_on.name).to.be.equal('test_created_on')
    expect(audit.modified_by.name).to.be.equal('test_modified_by')
    expect(audit.modified_on.name).to.be.equal('test_modified_on')
    
    // Check full names
    expect(audit.created_by.full_name).to.be.equal('test.test_created_by')
    expect(audit.created_on.full_name).to.be.equal('test.test_created_on')
    expect(audit.modified_by.full_name).to.be.equal('test.test_modified_by')
    expect(audit.modified_on.full_name).to.be.equal('test.test_modified_on')
  })
  it('Should not apply audit properties', function(){
    parsers.audit(no_audit_model,false)
    expect(no_audit_model.prototype._audit).to.be.equal(null)
  })
})
