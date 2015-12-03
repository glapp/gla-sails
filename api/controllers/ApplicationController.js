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
  port: sails.config.SWARM_PORT || 3376,
  ca: fs.readFileSync(sails.config.DOCKER_CERT_PATH + '/ca.pem'),
  cert: fs.readFileSync(sails.config.DOCKER_CERT_PATH + '/cert.pem'),
  key: fs.readFileSync(sails.config.DOCKER_CERT_PATH + '/key.pem')
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
      .then(extractComponents)
      .then()
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

var extractComponents = function (repo) {
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
      } else {
        console.log('Some other error with Docker-Compose file: ', err.code);
        cleanUp(path);
        reject()
      }

      // docker-compose
      var compose = yaml.load(path + '/docker-compose.yml');
      console.log(JSON.stringify(compose));

      for (var c in compose) {
        compose[c].name = c;
        compose[c].application_id = app_id;
      }
      resolve();
    });
  });
};

var createComponents = function(path, compose) {
  return new Promise(function (resolve, reject) {
    var result = [];
    async.each(compose, function (component, done) {

      // TODO: If "Build:", then build first. If "Image:", pull it first.

      Component.create(component, function (err, created) {
        if (err) throw err;
        result.push(created);
        done();
      })
    }, function (err) {
      if (err) reject();
      else resolve(result);
    });
  });
};

var makeTar = function (path) {
  return new Promise(function (resolve, reject) {
    fs.stat(path + '/Dockerfile', function (err, stat) {
      if (err == null) {
        console.log('File exists');
      } else if (err.code == 'ENOENT') {
        fs.writeFile(path + '/Dockerfile',
          "FROM gliderlabs/herokuish\n" +
          "COPY . /app\n" +
          "RUN herokuish buildpack build && export PORT=5000\n" +
          "EXPOSE 5000\n" +
          "CMD [\"/start\", \"web\"]",
          function (err) {
            if (err) return console.log('Write error: ', err);
          }
        );
      } else {
        //console.log('Some other error with Dockerfile: ', err.code);
        reject('Some other error with Dockerfile: ', err.code);
        return;
      }

      // Dockerfile exists

      // Make tar
      tar.pack(path).pipe(fs.createWriteStream(path + '.tar'))
        .on('finish', function () {
          //buildDockerImage(name, path);
          resolve(path);
        });
    });
  });

};


