var chai = require('chai')
var parsers = require('../../src/parsers')

describe('parsers', function(){
  it('Should contain 4 parsers', function(){
    var parserCount = Object.keys(parsers).length
    chai.expect(parserCount).to.be.equal(4)
  })
})