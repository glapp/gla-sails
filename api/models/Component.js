/**
* Component.js
*
* @description :: Contains data about the components
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    application_id: {
      model: 'Application',
      required: true
    },
    state: {
      type: 'string'
      // enum: ['blah3', 'blah4']
    },
    dockerImageURL: {
      type: 'string'
    }
  }
};

