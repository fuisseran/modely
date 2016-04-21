var Promise = require('bluebird')

var Modely = require('../index')({ client: 'pg',
  connection: 'postgres://test:test@localhost:5432/test'
})
var AccountModel
var account
var log = console.log
var testData = { type: 'type', status: 'status', username: 'usernameTest', firstname: 'firstname',
lastname: 'lastname', display_name: 'my full name', email: 'me@me.com' }

require('./account-model')
require('./person-model')
AccountModel = Modely.models.account
account = new AccountModel({ id: 1 })


/*
var testDataArray = [
  { type: 'type1', status: 'status1', username: 'usernameTest1', firstname: 'firstname1',
  lastname: 'lastname1', display_name: 'my full name1', email: 'me@me.com1' },
  { type: 'type2', status: 'status2', username: 'usernameTest2', firstname: 'firstname2',
  lastname: 'lastname2', display_name: 'my full name2', email: 'me@me.com2' },
  { type: 'type3', status: 'status3', username: 'usernameTest3', firstname: 'firstname3',
  lastname: 'lastname3', display_name: 'my full name3', email: 'me@me.com3' },
  { type: 'type4', status: 'status4', username: 'usernameTest4', firstname: 'firstname4',
  lastname: 'lastname4', display_name: 'my full name4', email: 'me@me.com4' },
  { type: 'type5', status: 'status5', username: 'usernameTest5', firstname: 'firstname5',
  lastname: 'lastname5', display_name: 'my full name5', email: 'me@me.com5' },
  { type: 'type6', status: 'status6', username: 'usernameTest6', firstname: 'firstname6',
  lastname: 'lastname6', display_name: 'my full name6', email: 'me@me.com6' },
  { type: 'type7', status: 'status7', username: 'usernameTest7', firstname: 'firstname7',
  lastname: 'lastname7', display_name: 'my full name7', email: 'me@me.com7' },
  { type: 'type8', status: 'status8', username: 'usernameTest8', firstname: 'firstname8',
  lastname: 'lastname8', display_name: 'my full name8', email: 'me@me.com8' },
  { type: 'type9', status: 'status9', username: 'usernameTest9', firstname: 'firstname9',
  lastname: 'lastname9', display_name: 'my full name9', email: 'me@me.com9' },
  { type: 'type10', status: 'status10', username: 'usernameTest10', firstname: 'firstname10',
  lastname: 'lastname10', display_name: 'my full name10', email: 'me@me.com10' }
]
*/


function testCreate() {
  return new Promise(function (resolve) {
    log('[TEST] Model $create')
    account.$user = {
      id: 0
    }
    account.$create(testData)
    .then(function () {
      log('[TEST] OK')
      resolve()
    }).catch(function (err) {
      log(err)
      log('[TEST] FAILED')
      resolve(err)
    })
  })
}

function testSave() {
  return new Promise(function (resolve) {
    var anotherAccount = new AccountModel()
    log('[TEST] Model $save')
    anotherAccount.$user = {
      id: 0
    }
    anotherAccount.$save(testData).then(function () {
      return anotherAccount.$save({ username: 'SaveTest2' })
    })
    .then(function () {
      resolve(log('[TEST] OK'))
    }).catch(function (err) {
      log(err)
      log('[TEST] FAILED')
      resolve(err)
    })
  })
}

function testDelete() {
  return new Promise(function (resolve) {
    log('[TEST] Model $delete')
    account.$delete(account.id).then(function () {
      log('[TEST] OK')
      resolve()
    }).catch(function (err) {
      log(err)
      log('[TEST] FAILED')
      resolve(err)
    })
  })
}

function testUpdate() {
  return new Promise(function (resolve) {
    log('[Test] Model $update')
    account.$update({ username: 'updatetest' }).then(function () {
      log('[TEST] OK')
      resolve()
    }).catch(function (err) {
      log(err)
      log('[TEST] FAILED')
      resolve(err)
    })
  })
}
/*
function testRead() {
  return new Promise(function (resolve) {
    var newModel = new AccountModel({ id: 1 })
    newModel.$read(account.id).then(function () {
      log('[TEST] OK')
      resolve()
    }).catch(function (err) {
      log(err)
      log('[TEST] FAILED')
      resolve(err)
    })
  })
}


function addTestData () {
  return new Promise(function (resolve) {
    var complete = 0
    var done = function () {
      complete++
      if (complete === testData_array.length) {
        resolve()
      }
    }
    testData_array.forEach(function (rowData, index) {
      var instance = new Modely.models.account({ id: 1 })
      instance.$create(rowData).then(function () {
        done(index)
      })
    })
  })
}
*/
function testTags() {
  return new Promise(function (resolve) {
    log('[Test] Tags')
    account._meta.tags = [{ label: 'test' }]
    account.$update().then(function () {
      log('[TEST] OK')
      resolve()
    }).catch(function (err) {
      log(err)
      log('[TEST] FAILED')
      resolve(err)
    })
  })
}

Modely.initialise()
  .then(testCreate)
  .then(testSave)
  .then(testUpdate)
  .then(testTags)
  .then(testDelete)
  .then(function () {
    var person = new Modely.models.person
    person.$search({ query: { id: 1, anotherthing: 'fasdfasdfa', 'account.id': 1 } })
    log(JSON.stringify(account, null, 2))
    log('Done')
  })
  // .then(function(){return test_delete(account.id)})