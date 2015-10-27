/**
* User.js
*
* @description :: Contains data about the users
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    email: {
      type: 'email',
      required: true,
      unique: true
    },
    encryptedPassword: {
      type: 'string',
      required: true
    },
    lastLoggedIn: {
      type: 'date',
      required: true,
      defaultsTo: new Date(0)
    },
    // url for gravatar
    gravatarUrl: {
      type: 'string'
    },
    applications: {
      collection: 'Application',
      via: 'owner'
    }
  }
};

