/**
* Organ.js
*
* @description :: Contains data about the organs
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    originalName: {
      type: 'string',
    },
    name: {
      type: 'string',
      required: true
    },
    application_id: {
      model: 'Application',
      required: true
    },
    state: {
      type: 'string'
      // enum: ['blah3', 'blah4']
    },
    image: {
      type: 'string'
    },
    environment: {
      type: 'array',
      defaultsTo: []
    },
    ports: {
      type: 'array',
      defaultsTo: []
    },
    expose: {
      type: 'array',
      defaultsTo: []
    },
    labels: {
      type: 'array',
      defaultsTo: []
    },
    volumes: {
      type: 'array',
      defaultsTo: []
    },
    volumes_from: {
      type: 'array',
      defaultsTo: []
    },
    ready: {
      type: 'boolean',
      defaultsTo: false
    },
    cells: {
      collection: 'Cell',
      via: 'organ_id'
    },
    rules: {
      collection: 'Rule',
      via: 'organs'
    }
  }
};

