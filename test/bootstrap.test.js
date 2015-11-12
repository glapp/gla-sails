var Sails = require('sails');
var Barrels = require('barrels');
require('should');

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



    // Load fixtures
    var barrels = new Barrels();

    // Save original objects in `fixtures` variable
    var fixtures = barrels.data;

    // Populate the DB
    barrels.populate(['User', 'Application'], function(err) {
      if (err) console.error(err);
      done(err);
    });
  });
});

// Global after hook
after(function (done) {
  console.log(); // Skip a line before displaying Sails lowering logs
  sails.lower(done);
});
