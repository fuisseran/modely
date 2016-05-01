module.exports = {
  account: {
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
        type: 'one-to-many',
        target: 'person'
      }
    ]
  },
  person: {
    version: 1,
    columns: {
      id: 'integer not null auto increment primary key',
      anotherthing: 'string'
    },
    taggable: true,
    audit: true,
    indexes: [],
    defaults: {
    }
  }
}
