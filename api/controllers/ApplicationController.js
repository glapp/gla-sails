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
    Application.find({owner: req.session.me}, function (err, apps) {
      if (err) res.notFound();
      res.ok(apps);
    })
  },

  addApplication: function (req, res) {
    Application.create({owner: req.session.me, name: req.param('name')}, function (err, created) {
      if (err) res.badRequest();
      res.ok(created);
    })
  },

  startCompose: function (req, res) {
    var app_id = req.param('app_id');
    var gitUrl = req.param('gitUrl');

    console.log('---------> DEBUG: Starting git clone');

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
      .then(function (repo) {
        console.log('Cloning finished.');
        res.ok();

        fs.stat(path + '/docker-compose.yml', function (err, stat) {
          if (err == null) {
            console.log('File exists');
          } else if (err.code == 'ENOENT') {
            // Doesn't exist yet
            console.log('No compose file');
            cleanUp(path);
            return;
          } else {
            //console.log('Some other error with Dockerfile: ', err.code);
            console.log('Some other error with Dockerfile: ', err.code);
            cleanUp(path);
            return;
          }

          // docker-compose up

        })
      })
      .catch(function (err) {
        console.log('--> ERROR', err);
        res.serverError(err);
        cleanUp(path);
      });
  }
};

var cleanUp = function (path) {
  rimraf(path, function (err) {
    if (err) throw err;
    fs.unlink(path + '.tar', function (err) {
      if (err) throw err;
      console.log('Cleaned up.');
    })
  })
};

