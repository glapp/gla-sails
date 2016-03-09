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
  getUserApps: function (req, res) {
    Application.find({owner: req.session.me})
      .populate('components')
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

    // TODO: With sails 0.11, it will be possible to nest populations. This is a quite efficient workaround until then.
    async.auto({
        app: function (cb) {
          Application
            .findOne({id: app_id, owner: user_id})
            .populate('log', {sort: 'createdAt DESC'})
            .populate('components', {sort: 'originalName DESC'})
            .exec(cb);
        },

        componentNode: ['app', function (cb, results) {
          Node.find({name: _.pluck(results.app.components, 'node')}).exec(cb);
        }],

        map: ['componentNode', function (cb, results) {
          // Index nodes by name
          var componentNode = _.indexBy(results.componentNode, 'name');

          // Get a plain object version of app & components
          var app = results.app.toObject();

          // Map nodes onto components
          app.components = app.components.map(function (component) {
            component.node = componentNode[component.node];
            return component;
          });
          return cb(null, app);
        }]

      }, function finish(err, results) {
        if (err) {
          return res.serverError(err);
        }
        return res.json(results.map);
      }
    );
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
          return DockerService.createComponents(path, updatedApp.components)
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

    Application.findOne({id: app_id, owner: user_id}).populate('components').exec(function (err, app) {
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
