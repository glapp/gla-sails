var Sails = require('sails');
var Barrels = require('barrels');
require('should');
var request = require('supertest');
var async = require('async');
var Passwords = require('machinepack-passwords');

// Global before hook
before(function (done) {
  // Lift Sails with test database
  Sails.lift({
    log: {
      level: 'error'
    },
    models: {
      connection: 'localDiskDb',
      migrate: 'drop'
    }
  }, function (err, sails) {
    if (err)
      return done(err);

    // Create first user
    request(sails.hooks.http.app)
      .post('/signup')
      .send({email: 'first@test.com', password: 'first'});

    // Load fixtures
    var barrels = new Barrels();

    // Save original objects in `fixtures` variable
    var fixtures = barrels.data;

    // Encrypt all the passwords
    if (barrels.data.user) {
      async.each(barrels.data.user, function (user, done) {
        Passwords.encryptPassword({
          password: user.encryptedPassword,
          difficulty: 10
        }).exec({
          // An unexpected error occurred.
          error: function (err) {
            console.error(err);
          },
          // OK.
          success: function (encPassword) {
            user.encryptedPassword = encPassword;
            done();
          }
        });
      }, function() {
        // Populate the DB
        barrels.populate(['user'], function (err) {
          if (err) console.error(err);
          barrels.populate(['application'], function (err) {
            if (err) console.error(err);
            done(err, sails);
          });
        });
      })
    }
  });
});

// Global after hook
after(function (done) {
  console.log(); // Skip a line before displaying Sails lowering logs
  sails.lower(done);
});
