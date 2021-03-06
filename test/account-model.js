var Modely = require('../')
Modely.register('account', {
  version: 1,
  columns: {
    id: 'integer not null auto increment primary key',
    type: 'string(8) not null',
    status: 'string(8) not null',
    username: 'string(100) not null',
    firstname: 'string(45)',
    lastname: 'string(45)',
    display_name: 'string(90)',
    email: 'string(255)'
  },
  taggable: true,
  audit: true,
  indexes: [],
  defaults: {
  },
  relationships: [
    {
      type: 'many-to-many',
      target: 'person'
    }
  ]
})
