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

// begin for MAPE ###################

  getAppInfo: function (req, res) {
    Application
      .find()
      .exec(function (err, apps) {
        if (err) res.notFound();
        else res.json({apps: apps});
      })
  },

// end for MAPE #####################


  getUserApps: function (req, res) {
    Application.find({owner: req.session.me})
      .populate('organs')
      .exec(function (err, apps) {
        if (err) res.notFound();
        else res.json({apps: apps});
      })
  },

  getAppDetails: function (req, res) {
    /*var user_id;

    if (req.session.me) {
      user_id = req.session.me;
    } else {
      res.forbidden();
      return;
    }*/

    var app_id = req.param('app_id');

    if (!app_id) return res.badRequest('app_id missing');

    DockerService.getCompleteAppData(app_id)
      .then(function (app) {
        res.ok(app)
      })
      .catch(function (err) {
        res.serverError(err);
      })
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

    var regex = /((git|ssh|http(s)?)|(git@[\w\.]+))(:(\/\/)?)(([\w\.@:\/\-~]+\/)+)([\w\.@:\/\-~]+)(\.git)(\/)?/;
    var result = gitUrl.match(regex);

    if (!gitUrl || !name || !result || !result[9]) return res.badRequest('Please specify a name and a valid Git Url!');
    var gitName = result[9];

    Application.create({owner: user_id, name: name, gitUrl: gitUrl, status: 'preparing'}, function (err, app) {
      if (err) return res.badRequest(err);

      AppLog.create({
        application_id: app.id,
        content: 'Application initialized.',
        type: 'info',
        name: 'init'
      }).exec(function (err) {
        if (err) console.error('Couldn\'t create log! ', err)
      });

      var path = require("path").join('.tmp', gitName);

      // Clone repo
      clone(gitUrl, path, null)
        // Extract components
        .then(function () {
          return DockerService.extractComponents(path, app.id);
        })
        // Send OK back and finish the process in the background
        .then(function (updatedApp) {
          res.ok({
            app: updatedApp
          });
          return DockerService.createComponents(path, updatedApp)
        })
        // Cleaning up, finishing
        .then(function () {
          // TODO: Socket emit 'ready'
          app.status = 'ready';
          app.save();
          cleanUp(path);

          AppLog.create({
            application_id: app.id,
            content: 'Application ready to be deployed.',
            type: 'info',
            name: 'create'
          }).exec(function (err, created) {
            if (err) console.error('Couldn\'t create log! ', err);
          })
        })
        .catch(function (err) {
          console.log('--> ERROR', err);
          app.status = 'failed';
          app.save();
          cleanUp(path);

          AppLog.create({
            application_id: app.id,
            content: 'Creation failed!',
            type: 'error',
            name: 'create'
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

    if (req.session.me) user_id = req.session.me;
    else return res.forbidden();

    var app_id = req.param('app_id');
    if (!app_id) return res.badRequest('No app id specified');

    Application.findOne({id: app_id, owner: user_id}).populate('organs').exec(function (err, app) {
      if (err) return res.serverError(err);
      if (!app) return res.notFound('No app with id ' + app_id + ' found')

      DockerService.handleNetwork(app)
        .then(function (network) {
          return DockerService.deploy(app, network)
        })
        .then(function (result) {
          app.status = 'deployed';
          AppLog.create({
            application_id: app_id,
            content: 'Deployed!',
            type: 'info',
            name: 'deploy'
          }).exec(function (err, created) {
            if (err) console.error('Couldn\'t create log! ', err);
            app.save(function (err) {
              if (err) res.serverError(err);
              else res.ok();
            });
          })
        })
        .catch(function (err) {
          res.serverError(err);
        });
    });
  },

  undeploy: function (req, res) {

    if (!req.session.me) return res.forbidden();

    var app_id = req.param('app_id');
    if (!app_id) return res.badRequest('No app id specified');

    var app;

    DockerService.getCompleteAppData(app_id)
      .then(function (completeApp) {
        app = completeApp;
        return DockerService.removeAppCells(completeApp)
      })
      .then(function () {
        return Cell.destroy({organ_id: _.map(app.organs, 'id')})
      })
      .then(function () {
        return Application.update({id: app_id}, {status: 'ready', networkId: null})
      })
      .then(function (updated) {
        AppLog.create({
          application_id: app_id,
          content: 'Undeployed.',
          type: 'info',
          name: 'undeploy'
        }).exec(function (err, created) {
          if (err) console.error('Couldn\'t create log! ', err);
          res.ok(updated[0]);
        });
      })
      .catch(function (err) {
        AppLog.create({
          application_id: app_id,
          content: 'Undeployement failed',
          type: 'error',
          name: 'undeploy'
        }).exec(function (logErr, created) {
          if (logErr) console.error('Couldn\'t create log! ', err);
          res.serverError(err);
        });
      });
  },

  remove: function (req, res) {

    if (!req.session.me) return res.forbidden();

    var app_id = req.param('app_id');
    var app;

    DockerService.getCompleteAppData(app_id)
      .then(function (completeApp) {
        app = completeApp;
        return DockerService.removeAppCells(completeApp)
      })
      .then(function () {
        return Cell.destroy({organ_id: _.map(app.organs, 'id')})
      })
      .then(function () {
        return Organ.destroy({application_id: app_id})
      })
      .then(function() {
        return AppLog.destroy({application_id: app_id})
      })
      .then(function () {
        return Application.destroy({id: app_id})
      })
      .then(function () {
        res.ok();
      })
      .catch(function (err) {
        res.serverError(err);
      });
  },

  rename: function (req, res) {

    var app_id = req.param('app_id');
    var newName = req.param('name');

    if (!newName) return res.badRequest('new name missing');

    Application.update({id: app_id}, {name: newName})
      .then(function(updated) {
        AppLog.create({
          application_id: app_id,
          content: 'Renamed application to ' + newName + '.',
          type: 'info',
          name: 'rename'
        }).exec(function (err, created) {
          if (err) console.error('Couldn\'t create log! ', err);
          res.ok(updated[0]);
        });
      })
      .catch(function(err) {
        AppLog.create({
          application_id: app_id,
          content: 'Renaming to ' + newName + 'failed.',
          type: 'error',
          name: 'rename'
        }).exec(function (logErr, created) {
          if (logErr) console.error('Couldn\'t create log! ', err);
          res.serverError(err);
        });
      });
  }
};


var cleanUp = function (path) {
  rimraf(path, function (err) {
    if (err) throw err;
  })
};
