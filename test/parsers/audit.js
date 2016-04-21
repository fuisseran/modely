var chai = require('chai')
var should = chai.should()
var expect = chai.expect
var parsers = require('../../src/parsers')

function auditModel() {}
Object.defineProperty(auditModel.prototype, '_name', { value: 'test' })

function noAuditModel() {}
Object.defineProperty(noAuditModel.prototype, '_name', { value: 'test' })

describe('parsers.audit', function () {
  it('Should apply audit properties', function () {
    var audit = auditModel.prototype._audit
    parsers.audit(auditModel, true)
    
    // Check properties exist
    should.exist(audit.created_by)
    should.exist(audit.created_on)
    should.exist(audit.modified_by)
    should.exist(audit.modified_on)
    
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
  it('Should not apply audit properties', function () {
    parsers.audit(noAuditModel, false)
    expect(noAuditModel.prototype._audit).to.be.equal(null)
  })
})
