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
    }
  },
  person: {
    version: 1,
    columns: {
      id: 'integer not null auto increment primary key',
      anotherthing: 'string'
    },
    indexes: [],
    defaults: {
    },
    relationships: [
      {
        type: 'many-to-many',
        source: 'account'
      }
    ]
  },
  sitemapnode: {
    version: 1,
    columns: {
      id: 'integer not null auto increment primary key',
      label: 'string(255) required',
      slug: 'string(255) required',
      parentid: 'integer',
      type: 'string(20)'
    }
  },
  sitemapalias: {
    version: 1,
    columns: {
      id: 'integer not null auto increment primary key',
      license: 'integer required',
      language: 'integer required',
      label: 'string(255) required',
      slug: 'string(255) required',
      hide: 'boolean required'
    }
  }
}
