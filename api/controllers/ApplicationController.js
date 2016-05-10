/**
 * ApplicationController
 *
 * @description :: Server-side logic for managing Applications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var clone = require("nodegit").Clone.clone;
var fs = require('fs');
var rimraf = require('rimraf');

module.exports = {

  getInfo: function (req, res) {
    Application.find()
      //.populate('organs')
      .exec(function (err, apps) {
        if (err) res.notFound();
        else res.json({apps: apps});
      })
  },

  getUserApps: function (req, res) {
    Application.find({owner: req.session.me})
      .populate('organs')
      .exec(function (err, apps) {
        if (err) res.notFound();
        else res.json({apps: apps});
      })
  },

  getAppDetails: function (req, res) {
    var user_id;

    if (req.session.me) {
      user_id = req.session.me;
    } else {
      res.forbidden();
      return;
    }

    var app_id = req.param('app_id');


    Application
      .findOne({id: app_id, owner: user_id})
      .populate('log', {sort: 'createdAt DESC'})
      .populate('organs')
      .exec(function (err, app) {
        if (err) return res.serverError(err);

        // TODO: With a future sails version, it will be possible to nest populations. This is a quite efficient workaround until then.

        Organ
          .find({id: _.map(app.organs, 'id')})
          .populate('cells')
          .populate('dependent_on')
          .exec(function (err, organs) {
            if (err) return res.serverError(err);

            // TODO This is inefficient since it's querying the db for every organ -> nested population should fix this
            async.map(organs, function (organ, done) {
              Cell
                .find({id: _.map(organ.cells, 'id')})
                .populate('host')
                .exec(function (err, cells) {
                  if (err) return done(err);

                  // TODO This is a workaround because somehow to send organ directly doesn't include the hosts of the cells
                  var newOrgan = _.extend({}, organ);
                  newOrgan.cells = cells;

                  done(null, newOrgan);
                })
            }, function(err, newOrgans) {
              if (err) return res.serverError(err);

              // TODO This is a workaround because somehow to send app directly doesn't include the cells of the organs
              var newApp = _.extend({}, app);
              newApp.organs = newOrgans;
              res.ok(newApp);
            });


          });
      });
  },

  addApplication: function (req, res) {
    var user_id;

    if (req.session.me) {
      user_id = req.session.me;
    } else {
      res.forbidden();
      return;
    }

    var gitUrl = req.param('gitUrl');
    var name = req.param('name');

    Application.create({owner: user_id, name: name, gitUrl: gitUrl, status: 'preparing'}, function (err, app) {
      if (err) {
        res.badRequest(err);
        return;
      }

      AppLog.create({
        application_id: app.id,
        content: 'Application initialized.'
      }).exec(function (err) {
        if (err) console.error('Couldn\'t create log! ', err)
      });

      if (req.isSocket) {
        Application.watch(req);
        Application.subscribe(req, [app.id]);
      }

      console.log('---------> Starting git clone');

      var regex = /((git|ssh|http(s)?)|(git@[\w\.]+))(:(\/\/)?)(([\w\.@:\/\-~]+\/)+)([\w\.@:\/\-~]+)(\.git)(\/)?/;
      var result = gitUrl.match(regex);

      if (!result || !result[9]) {
        app.status = 'failed';
        app.save();
        return;
      }

      var name = result[9];
      var path = require("path").join('.tmp', name);

      // Promisified process
      clone(gitUrl, path, null)
        .then(function () {
          return DockerService.extractComponents(path, app.id);
        })
        .then(function (updatedApp) {
          res.ok({
            app: updatedApp
          });
          return DockerService.createComponents(path, updatedApp)
        })
        .then(function () {
          app.status = 'ready';
          app.save();
          cleanUp(path);

          AppLog.create({
            application_id: app.id,
            content: 'Application ready to be deployed.'
          }).exec(function (err, created) {
            if (err) console.error('Couldn\'t create log! ', err);
            // TODO: Socket emit 'ready'
            res.ok();
          })
        })
        .catch(function (err) {
          console.log('--> ERROR', err);
          app.status = 'failed';
          app.save();
          cleanUp(path);

          AppLog.create({
            application_id: app.id,
            content: 'Creation failed!'
          }).exec(function (err, created) {
            if (err) console.error('Couldn\'t create log! ', newErr);
            // TODO: Socket emit 'failed'
            res.serverError(err);
          });
        });
    });
  },

  deploy: function (req, res) {
    var user_id;

    if (req.session.me) {
      user_id = req.session.me;
    } else {
      res.forbidden();
      return;
    }

    var app_id = req.param('app_id');

    Application.findOne({id: app_id, owner: user_id}).populate('organs').exec(function (err, app) {
      if (err) {
        res.serverError(err);
        console.error(err);
        return;
      }
      DockerService.handleNetwork(app)
        .then(function (network) {
          return DockerService.deploy(app, network)
        })
        .then(function (result) {
          app.status = 'deployed';
          AppLog.create({
            application_id: app_id,
            content: 'Deployed!'
          }).exec(function (err, created) {
            if (err) console.error('Couldn\'t create log! ', err);
            app.save(function (err) {
              if (err) res.serverError(err);
              else res.ok();
            });
          })
        })
        .catch(function (err) {
          res.badRequest(err);
        });
    });
  }
};

var cleanUp = function (path) {
  rimraf(path, function (err) {
    if (err) throw err;
  })
};
