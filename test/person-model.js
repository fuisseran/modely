var Modely = require('../')
Modely.register('person',{
  version:1,
  columns: {
    id              : 'integer not null auto increment primary key',
    anotherthing   : 'string'
  },
  taggable : true,
  audit : true,
  indexes : [],
  defaults : {
    
  },
  relationships:[
    {
      type:'one-to-one',
      source:'account'
    }
  ]
  
  
})
