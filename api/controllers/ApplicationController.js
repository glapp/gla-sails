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
        var components = [];
        _.each(apps, function (app) {
          _.each(app.components, function (comp) {
            components.push(comp);
          })
        });
        res.json({
          apps: apps,
          components: components
        });
      })
  },

  addApplication: function (req, res) {
    Application.create({owner: req.session.me, name: req.param('name')}, function (err, created) {
      if (err) res.badRequest(err);
      res.ok(created);
    })
  },

  registerComponents: function (req, res) {
    var app_id = req.param('app');
    var gitUrl = req.param('gitUrl');
    var user_id = req.session.me;

    console.log('---------> Starting git clone');

    var regex = /((git|ssh|http(s)?)|(git@[\w\.]+))(:(\/\/)?)(([\w\.@:\/\-~]+\/)+)([\w\.@:\/\-~]+)(\.git)(\/)?/;
    var result = gitUrl.match(regex);

    if (!result || !result[9]) {
      res.badRequest('invalid git url');
      return;
    }

    var name = result[9];
    var path = require("path").join('.tmp', name);

    // Promisified process
    clone(gitUrl, path, null)
      .then(function () {
        return DockerService.extractComponents(path, app_id);
      })
      .then(function (components) {
        console.log(components);
        return DockerService.createComponents(path, components, user_id, app_id)
      })
      .then(function (result) {
        res.ok(result);
        cleanUp(path);
      })
      .catch(function (err) {
        console.log('--> ERROR', err);
        res.serverError(err);
        cleanUp(path);
      });
  },

  deploy: function (req, res) {
    var app_id = req.param('app_id');

    Application.findOne({id: app_id}).populate('components').exec(function (err, app) {
      if (err) throw err;
      DockerService.handleNetwork(app)
        .then(function (network) {
          return DockerService.deploy(app, network)
        })
        .then(function (result) {
          res.ok(result);
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
