var chai = require('chai')
var should = chai.should()
var expect = chai.expect
var assert = chai.assert
var parsers = require('../../src/parsers')

function getTestModel() { 
  var Model = {
    _columns:{
      col1:'',
      col2:''
    } 
  }
  return Model  
}

describe('parsers.properties', function(){
  var Model = getTestModel()
  parsers.properties(Model,{col1:'val1',col2:'val2',col3:'val3'})
  it('Should assign known column properites to the Model',function(){
    expect(Model.col1).to.be.equal('val1')
    expect(Model.col2).to.be.equal('val2')
  })
  it('Should not assign unknown column properites to the Model',function(){
    should.not.exist(Model.col3)
  })
  it('Should assign non core properties to the "_raw_properties" property',function(){
    expect(Object.keys(Model._raw_properties).length).to.be.equal(1)
    expect(Model._raw_properties.col3).to.be.equal('val3')
  })
})