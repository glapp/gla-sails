/**
 * Node.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  autoPK: false,
  migrate: 'drop',

  attributes: {
    name: {
      type: 'string',
      primaryKey: true,
      unique: true
    },
    ip: {
      type: 'string',
      required: true
    },
    status: {
      type: 'string'
    },
    containers: {
      type: 'string'
    },
    reservedCPUs: {
      type: 'string'
    },
    reservedMemory: {
      type: 'string'
    },
    labels: {
      type: 'json'
    },
    error: {
      type: 'string'
    },
    cells: {
      collection: 'cell',
      via: 'host'
    }
  }
};

