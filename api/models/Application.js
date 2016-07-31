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
      required: true
    },
    organs: {
      collection: 'Organ',
      via: 'application_id',
      // required: true
    },
    networkId: {
      type: 'string'
    },
    status: {
      type: 'string',
    },
    minimize: {
      type: 'string',
      // enum: ['blah1', 'blah2']
      // required: true
    },
    rules: {
      collection: 'Rule',
      via: 'application_id'
    },
    log: {
      collection: 'AppLog',
      via: 'application_id'
    }
  }
};
