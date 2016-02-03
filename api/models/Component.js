/**
* Component.js
*
* @description :: Contains data about the components
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
    node_name: {
      type: 'string'
    },
    node_ip: {
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
    ready: {
      type: 'boolean',
      defaultsTo: false
    }
  }
};

