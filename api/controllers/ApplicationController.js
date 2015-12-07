/**
 * ApplicationController
 *
 * @description :: Server-side logic for managing Applications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var clone = require("nodegit").Clone.clone;
var fs = require('fs');
var rimraf = require('rimraf');
var yaml = require('yamljs');
var async = require('async');
var tar = require('tar-fs');
var _ = require('lodash');

module.exports = {
  getUserApps: function (req, res) {
    Application.find({owner: req.session.me})
      .populate('components')
      .exec(function (err, apps) {
        if (err) res.notFound();
        var components = [];
        _.each(apps, function(app) {
          _.each(app.components, function(comp) {
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
      if (err) res.badRequest();
      res.ok(created);
    })
  },

  registerComponents: function (req, res) {
    var app_id = req.param('app');
    var gitUrl = req.param('gitUrl');
    var user_id = req.session.me;

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
      .then(function() {
        return extractComponents(path, app_id);
      })
      .then(function(components) {
        console.log(components);
        return createComponents(path, components, user_id)
      })
      .then(function(result) {
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
        docker.createNetwork({
          Name: app.name
        }, function (err, network) {
          if (err) {
            res.serverError(err);
            return;
          }
          var components = app.components;
          async.each(components, function (component, done) {
            var env = [];
            var exposed = {};
            var portBindings = {};

            if (component.ports) {
              for (var i = 0; i < component.ports.length; i++) {
                var split = component.ports[i].split(":");
                exposed[split[1] + "/tcp"] = {};
                portBindings[split[1] + "/tcp"] = [{
                  HostPort: split[0]
                }];
              }
            }

            docker.createContainer({
              Image: component.image,
              name: component.name,
              Env: component.environment,
              ExposedPorts: exposed,
              HostConfig: {
                PortBindings: portBindings,
              }
            }, function (err, container) {
              if (err) throw err;
              else {
                container.start(function (err, data) {
                  if (err) throw err;
                  // network.connect({           // Docker swarm issue: https://github.com/docker/swarm/issues/1402
                  //  container: container.id    // TODO: Uncomment as soon as docker swarm bug is fixed
                  //}, function (err, data) {
                  //  if (err) throw err;
                    done();
                  //});
                })
              }
            });
          }, function (err) {
            if (err) {
              res.serverError(err);
              return;
            }
            network.inspect(function (err, data) {
              if (err) {
                res.serverError(err);
                return;
              }
              res.ok(data.Containers);
            });
          })
        })
      });
  }
};

var cleanUp = function (path) {
  rimraf(path, function (err) {
    if (err) throw err;
  })
};

var extractComponents = function (path, app_id) {
  return new Promise(function(resolve, reject) {
    console.log('Cloning finished.');
    fs.stat(path + '/docker-compose.yml', function (err, stat) {
      if (err == null) {
        console.log('File exists');
      } else if (err.code == 'ENOENT') {
        // Doesn't exist yet
        console.log('No compose file');
        cleanUp(path);
        reject();
        return;
      } else {
        console.log('Some other error with Docker-Compose file: ', err.code);
        cleanUp(path);
        reject();
        return;
      }

      // docker-compose
      var components = yaml.load(path + '/docker-compose.yml');
      console.log(JSON.stringify(components));

      for (var c in components) {
        components[c].name = c;
        components[c].application_id = app_id;
      }
      resolve(components);
    });
  });
};

var createComponents = function(path, components, user_id) {
  return new Promise(function (resolve, reject) {
    var result = [];
    async.each(components, function (component, done) {
      async.series([
        function(finished) {
          if (!component.image && component.build) {
            component.image = 'local/' + component.name;
            var buildpath = require('path').join(path, component.build);
            // Make tar
            tar.pack(buildpath).pipe(fs.createWriteStream(buildpath + '.tar'))
              .on('finish', function () {
                docker.buildImage(buildpath + '.tar', {t: component.image}, function (err, stream) {
                  if (err) throw err;

                  docker.modem.followProgress(stream, onFinished, onProgress);

                  function onProgress(event) {
                    console.log(_.values(event));
                  }

                  function onFinished(err, output) {
                    if (err) throw err;
                    // Sets the status to ready as soon as image is ready on docker swarm
                    Component.findOrCreate(component, component, function(err, result) {
                      result.ready = true;
                      result.save();
                    });
                  }
                });
                // Callback outside the build function to make it build in the background
                finished();
              })
              .on('error', function(err) {
                throw err;
              })
          } else if (component.image && !component.build) {
            docker.pull(component.image, function (err, stream) {
              if (err) throw err;

              docker.modem.followProgress(stream, onFinished, onProgress);

              function onProgress(event) {
                console.log(_.values(event));
              }

              function onFinished(err, output) {
                if (err) throw err;

                docker.getImage(component.image, function(err, image) {
                  image.inspect(function(err, data) {
                    if (err) throw err;

                    Component.findOrCreate(component, component, function(err, result) {
                      // Sets the status to ready as soon as image is ready on docker swarm
                      result.ready = true;
                      // TODO: Set properties based on the image information (e.g., exposed ports, used volumes, etc.)
                      result.imageId = data.Id;
                      result.save();
                    });
                  })
                });
              }
            });
            // Callback outside the pull function to make it pull in the background
            finished();
          } else {
            throw 'Build / Image attributes not valid';
          }
        },
        function(finished) {
          Component.findOrCreate({id: component.id}, component, function (err, created) {
            if (err) throw err;
            result.push(created);
            finished();
          })
        }
      ], function(err, results) {
        if (err) throw err;
        done();
      });

    }, function (err) {
      if (err) reject(err);
      else resolve(result);
    });
  });
};
