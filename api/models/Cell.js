/**
 * Cell.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    organ_id: {
      model: 'Organ',
      required: true
    },
    container_id: {
      type: 'string'
    },
    host: {
      model: 'host'
    },
    published_port: {
      type: 'string'
    },
  }
};

