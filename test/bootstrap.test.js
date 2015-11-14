var Sails = require('sails');
var Barrels = require('barrels');
require('should');
var request = require('supertest');


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
  }, function(err, sails) {
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

    // Populate the DB
    barrels.populate(['user'], function(err) {
      if (err) console.error(err);
      barrels.populate(['application'], function(err) {
        if (err) console.error(err);
        done(err, sails);
      });
    });
  });
});

// Global after hook
after(function (done) {
  console.log(); // Skip a line before displaying Sails lowering logs
  sails.lower(done);
});
