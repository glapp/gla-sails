/**
* Application.js
*
* @description :: Contains data about the applications
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    owner: {
      model: 'User',
      required: true
    },
    name: {
      type: 'string',
      required: true
    },
    gitUrl: {
      type: 'string',
    },
    components: {
      collection: 'Component',
      via: 'application_id',
      // required: true
    },
    status: {
      type: 'string',
    },
    minimize: {
      type: 'string',
      // enum: ['blah1', 'blah2']
      // required: true
    },
    constraints: {
      collection: 'Constraint',
      via: 'application_id'
    },
    networkId: {
      type: 'string'
    }
  }
};
