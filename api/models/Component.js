/**
* Component.js
*
* @description :: Contains data about the components
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
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
      type: 'array'
    },
    ports: {
      type: 'array'
    }

  }
};

