var Promise = require('bluebird')

var Modely = require('../index')({client: 'pg',
  connection : "postgres://test:test@localhost:5432/test"})

var AccountModel = require('./account-model')
var PersonModel = require('./person-model')

var db = Modely.knex

var account = new Modely.models.account({id:1})

var test_data = {type:'type', status:'status', username:'usernameTest', firstname:'firstname',lastname:'lastname', display_name:'my full name', email:'me@me.com'}

var test_data_array = [
  {type:'type1', status:'status1', username:'usernameTest1', firstname:'firstname1',lastname:'lastname1', display_name:'my full name1', email:'me@me.com1'},
  {type:'type2', status:'status2', username:'usernameTest2', firstname:'firstname2',lastname:'lastname2', display_name:'my full name2', email:'me@me.com2'},
  {type:'type3', status:'status3', username:'usernameTest3', firstname:'firstname3',lastname:'lastname3', display_name:'my full name3', email:'me@me.com3'},
  {type:'type4', status:'status4', username:'usernameTest4', firstname:'firstname4',lastname:'lastname4', display_name:'my full name4', email:'me@me.com4'},
  {type:'type5', status:'status5', username:'usernameTest5', firstname:'firstname5',lastname:'lastname5', display_name:'my full name5', email:'me@me.com5'},
  {type:'type6', status:'status6', username:'usernameTest6', firstname:'firstname6',lastname:'lastname6', display_name:'my full name6', email:'me@me.com6'},
  {type:'type7', status:'status7', username:'usernameTest7', firstname:'firstname7',lastname:'lastname7', display_name:'my full name7', email:'me@me.com7'},
  {type:'type8', status:'status8', username:'usernameTest8', firstname:'firstname8',lastname:'lastname8', display_name:'my full name8', email:'me@me.com8'},
  {type:'type9', status:'status9', username:'usernameTest9', firstname:'firstname9',lastname:'lastname9', display_name:'my full name9', email:'me@me.com9'},
  {type:'type10', status:'status10', username:'usernameTest10', firstname:'firstname10',lastname:'lastname10', display_name:'my full name10', email:'me@me.com10'}
]

function test_create(){
  return new Promise(function(resolve, reject){
    console.log('[TEST] Model $create')
    account.$user = {
      id:0
    }
    account.$create(test_data)
    .then(function(){
      console.log('[TEST] OK')
      resolve()
    }).catch(function(err){
      console.log(err)
      console.log('[TEST] FAILED')
      resolve(err)
    })
  })
}

function test_delete(){
  return new Promise(function(resolve,reject){
    console.log('[TEST] Model $delete')
    account.$delete(account.id).then(function(){
      console.log('[TEST] OK')
      resolve()
    }).catch(function(err){
      console.log(err)
      console.log('[TEST] FAILED')
      resolve(err)
    })
  })
}

function test_update(){
  return new Promise(function(resolve, reject){
    console.log('[Test] Model $update')
    account.$update({username:'updatetest'}).then(function(){
      console.log('[TEST] OK')
      resolve()
    }).catch(function(err){
      console.log(err)
      console.log('[TEST] FAILED')
      resolve(err)
    })
  })
}

function test_read(){
  return new Promise(function(resolve,reject){
    var new_model = new Modely.models.account({id:1})
    new_model.$read(account.id).then(function(){
      console.log('[TEST] OK')
      resolve()
    }).catch(function(err){
      console.log(err)
      console.log('[TEST] FAILED')
      resolve(err)
    })
  })
}

function add_test_data(){
  return new Promise(function(resolve,reject){
    var complete = 0
    var done = function(){
      complete++
      if(complete === test_data_array.length){
        resolve()
      }
    }
    test_data_array.forEach(function(row_data, index){
      var instance = new Modely.models.account({id:1})
      instance.$create(row_data).then(function(){
        done(index)
      })
    })
  })
}

function test_tags(){
  return new Promise(function(resolve,reject){
    console.log('[Test] Tags')
    account._meta.tags=[{label:'test'}]
    account.$update().then(function(){
      console.log('[TEST] OK')
      resolve()
    }).catch(function(err){
      console.log(err)
      console.log('[TEST] FAILED')
        resolve(err)
    })
  })
}

Modely.initialise()
  .then(test_create)
  .then(test_update)
  .then(test_tags)
  //.then(test_delete)
  .then(function(){
    console.log(JSON.stringify(account, null, 2))
    console.log("Done")
  })
  //.then(function(){return test_delete(account.id)})
  