/**
 * ApplicationController
 *
 * @description :: Server-side logic for managing Applications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var clone = require("nodegit").Clone.clone;
var fs = require('fs');
var rimraf = require('rimraf');
var Docker = require('dockerode');
var yaml = require('yamljs');
var async = require('async');

var docker = new Docker({
  host: sails.config.SWARM_HOST || 'localhost',
  port: sails.config.SWARM_PORT || 3376
});

module.exports = {
  getUserApps: function (req, res) {
    Application.find({owner: req.session.me})
      .populate('components')
      .exec(function (err, apps) {
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

  registerComponents: function (req, res) {
    var app_id = req.param('app');
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

        fs.stat(path + '/counter/docker-compose.yml', function (err, stat) {
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
          var compose = yaml.load(path + '/counter/docker-compose.yml');
          console.log(JSON.stringify(compose));

          for (var c in compose) {
            compose[c].name = c;
            compose[c].application_id = app_id;
          }

          var result = [];
          async.each(compose, function(component, done) {
            Component.create(component, function (err, created) {
              if (err) res.badRequest();
              result.push(created);
              done();
            })
          }, function() {
            res.ok(result);
            cleanUp(path);
          });
        })
      })
      .catch(function (err) {
        console.log('--> ERROR', err);
        res.serverError(err);
        cleanUp(path);
      });
  },

  deploy: function(req, res) {
    var app = req.param('app');

    docker.info(function(err, data) {
      console.log(arguments);
    });
    /*docker.createNetwork({
      Name: app.name
    }, function(err, network) {
      if (err) {
        res.serverError(err);
        return;
      }
      async.each(app.components, function(component, done) {
        var env = [];
        var exposed = {};
        var portBindings = {};


        for (var i = 0; i < component.environment; i++) {
          env.push(component.environment[i]);
        }

        for (var i = 0; i < component.ports; i++) {
          var split = component.ports[i].split(':');
          exposed[split[1] + "/tcp"] = {};
          portBindings[split[1] + "/tcp"] = [{
            HostPort: split[0]
          }];
        }

        docker.createContainer({
          Image: component.image,
          name: component.name,
          Env: env,
          // ExposedPorts: exposed,
          HostConfig: {
            PortBindings: portBindings,
            Network: app.name
          }
        }, function(err, container) {
          container.start(function(err, data) {
            console.log(data);
            done()
          })
        });
      }, function(err) {
        if (err) res.serverError(err);
        else res.ok();
      })
    })*/
  }
};

var cleanUp = function (path) {
  rimraf(path, function (err) {
    if (err) throw err;
  })
};

