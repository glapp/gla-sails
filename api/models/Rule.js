/**
* Constraint.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    application_id: {
      model: 'Application',
      required: true
    },
    metric: {
      type: 'String',
      // enum: ['blah5', 'blah6'],
      required: true
    },
    operator: {
      type: 'String',
      // enum: ['blah7', 'blah8'],
    },
    value: {
      type: 'String',
    },
    organs: {
      collection: 'Organ',
      via: 'rules',
      dominant: true
    },
    weight: {
      type: 'float',
      required: false
    }
  }
};

