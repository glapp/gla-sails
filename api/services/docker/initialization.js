/**
 * Created by isler on 13.05.2016.
 */
var Docker = require('dockerode');
var fs = require('fs');
var yaml = require('yamljs');
var async = require('async');
var tar = require('tar-fs');
var _ = require('lodash');

var common = require('./common.js');

var swarmHostEnv = process.env.SWARM_HOST || sails.config.SWARM_HOST || 'localhost:3376';
var swarmHostArray = swarmHostEnv.split(":");
var swarmHost = swarmHostArray[0];
var swarmPort = swarmHostArray[1] ? swarmHostArray[1] : '3376';

var CERT_PATH = process.env.CERT_PATH || require('path').join(require('os').homedir(), '.docker', 'machine', 'certs');

var swarm = new Docker({
  host: swarmHost,
  port: swarmPort,
  ca: fs.readFileSync(CERT_PATH + '/ca.pem'),
  cert: fs.readFileSync(CERT_PATH + '/cert.pem'),
  key: fs.readFileSync(CERT_PATH + '/key.pem')
});

module.exports = {
  swarm: swarm,

  extractComponents: function (path, app_id) {
    return new Promise(function (resolve, reject) {
      console.log('Cloning finished.');
      fs.stat(path + '/docker-compose.yml', function (err, stat) {
        if (err == null) {
          console.log('Found docker-compose.yml!');
        } else if (err.code == 'ENOENT') {
          // Doesn't exist yet
          console.log('No docker-compose file!');
          reject();
          return;
        } else {
          console.log('Some other error with Docker-Compose file: ', err.code);
          reject();
          return;
        }

        // Read docker-compose file
        var components = yaml.load(path + '/docker-compose.yml');

        if (components.version && components.version == '2') {
          // Replaces components array with 'services' array of the new version
          components = components.services;
        }

        var regex = {};

        // Adjust metadata of components
        for (var c in components) {
          if (components[c].container_name) {
            components[c].originalName = components[c].container_name;
            components[c].name = app_id + "_" + components[c].container_name;
          } else {
            components[c].originalName = c;
            components[c].name = app_id + "_" + c;
          }
          components[c].application_id = app_id;
          regex[components[c].name] = new RegExp("=" + escapeRegExp(c) + "$");

          // Stringify environment variables
          components[c].environment = common.stringifyObjects(components[c].environment);

          // Stringify labels
          components[c].labels = common.stringifyObjects(components[c].labels);

          // Make sure the ports are in string format
          if (components[c].ports) {
            components[c].ports = _.map(components[c].ports, function (port) {
              return port.toString();
            });
          }

          if (components[c].expose) {
            components[c].expose = _.map(components[c].expose, function (port) {
              return port.toString();
            });
          }

          var singlePort = /^([0-9]+\w)$/;
          var portRange = /^([0-9]+\w)-([0-9]+\w)$/;
          var portAssignment = /^([0-9]+\w):([0-9]+\w)$/;
          var portRangeAssignment = /^([0-9]+\w)-([0-9]+\w):([0-9]+\w)-([0-9]+\w)$/;

          // Add published ports, assign them to random host port
          var ports = [];
          _.forEach(components[c].ports, function (port) {
            if (singlePort.test(port) || portAssignment.test(port)) {
              var portSplit = port.split(':');
              port = portSplit[1] ? portSplit[1] : portSplit[0];
              ports.push(port);
            } else if (portRange.test(port) || portRangeAssignment.test(port)) {
              console.warn('port ranges are not supported yet');
            } else {
              console.warn('port format is not supported');
            }
          });
          components[c].ports = ports;
        }

        // Replace the name environment variables of all components
        var connections = {};
        _.map(components, function (component) {
          connections[component.name] = [];
          var newEnvironment = [];
          _.forEach(component.environment, function (env) {
            for (var newName in regex) {
              if (regex[newName].test(env)) {
                // fill array with dependent_on names
                connections[component.name].push(newName);
                env = env.replace(regex[newName], "=" + newName)
              }
            }
            newEnvironment.push(env);
          });
          component.environment = newEnvironment;
          return component;
        });

        // Already create the components so the user can be informed
        async.map(components, function (component, done) {
          Organ.create(component, function (err, created) {
            if (err) return done(err);
            else done(null, created);
          });
        }, function (err, organs) {
          if (err) reject(err);
          else {
            async.each(organs, function (organ, done) {
              Organ.find({name: connections[organ.name]})
                .populate('dependent_on')
                .exec(function (err, conns) {
                  organ.dependent_on.add(_.map(conns, 'id'));
                  organ.save(done);
                });
            }, function (err) {
              if (err) return reject(err);
              Application.findOne({id: app_id})
                .populate('organs')
                .exec(function (err, completeApp) {
                  if (err) return reject(err);
                  resolve(completeApp);
                })
            });
          }
        })
      });
    });
  },

  createComponents: function (path, app) {
    return new Promise(function (resolve, reject) {

      async.each(app.organs, function (organ, done) {
        var tag = organ.name;
        var changed = false;
        if (!organ.image) {
          organ.image = tag;
          changed = true;
        }

        // Find database entry
        Organ.findOne({id: organ.id}, function (err, found) {
          if (err) return done(err);

          // If we have to build the image first
          if (changed && organ.build) {
            var buildpath = require('path').join(path, organ.build);
            // Make tar
            tar.pack(buildpath).pipe(fs.createWriteStream(buildpath + '.tar'))
              .on('finish', function () {
                DockerService.swarm.buildImage(buildpath + '.tar', {t: organ.image}, function (err, stream) {
                  if (err) return done(err);

                  DockerService.swarm.modem.followProgress(stream, onFinished, onProgress);

                  function onProgress(event) {
                    console.log(_.values(event));
                  }

                  function onFinished(err, output) {
                    if (err) return done(err);
                    completeParameters(found)
                      .then(done)
                      .catch(function (err) {
                        done(err);
                      });
                  }
                });
              })
              .on('error', function (err) {
                return done(err);
              });
            // If the image has to be pulled
          } else if (organ.image && !organ.build) {
            var image = DockerService.swarm.getImage(organ.image);
            image.inspect(function (err, inspectData) {
              if (err && err.statusCode != 404) return done(err);
              if (err && err.statusCode == 404) {  // Image is not pulled yet -> Pull
                DockerService.swarm.pull(organ.image, function (err, stream) {
                  if (err) return done(err);

                  DockerService.swarm.modem.followProgress(stream, onFinished, onProgress);

                  function onProgress(event) {
                    console.log(_.values(event));
                  }

                  function onFinished(err, output) {
                    if (err) return done(err);
                    completeParameters(found)
                      .then(done)
                      .catch(function (err) {
                        done(err);
                      });
                  }
                });
              } else { // Image is already pulled
                completeParameters(found)
                  .then(done)
                  .catch(function (err) {
                    done(err);
                  });
              }
            });

          } else {
            done(new Error("Build / Image attributes not valid"))
          }
        })
      }, function (err) {
        if (err) reject(err);
        else resolve();
      });
    })
  },

  obtainConsulIp: function() {
    return new Promise(function(resolve, reject) {
      var docker = new Docker({
        host: swarmHost,
        port: '2376',
        ca: fs.readFileSync(CERT_PATH + '/ca.pem'),
        cert: fs.readFileSync(CERT_PATH + '/cert.pem'),
        key: fs.readFileSync(CERT_PATH + '/key.pem')
      });

      var swarmMasterContainer = docker.getContainer('swarm-agent-master');

      swarmMasterContainer.inspect(function(err, data) {
        if (err) return reject(err);
        var consulErr = new Error('No Consul IP found');

        var consulRegEx = /^consul\:\/\/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\:[0-9]{1,5})$/;

        if (data.Args) {
          var consulArg = _.find(data.Args, function(arg) {
            return consulRegEx.test(arg);
          });
          if (consulArg) {
            var matches = consulArg.match(consulRegEx);
            var consulUrl = matches[1] ? matches[1] : null;
            if (consulUrl) {
              resolve(consulUrl);
            } else reject(consulErr);
          } else reject(consulErr);
        } else reject(consulErr);
      })
    });

  }

};

function escapeRegExp(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function completeParameters(organ) {
  return new Promise(function (resolve, reject) {
    var newImage = DockerService.swarm.getImage(organ.image);
    newImage.inspect(function (err, inspectData) {
      if (err) reject(err);
      else {
        // Exposed ports
        if (!organ.expose) organ.expose = [];
        for (var attr in inspectData.Config.ExposedPorts) {
          var split = attr.split('/');
          var exists = _.some(organ.expose, function (port) {
            return port == split[0];
          });
          if (!exists) organ.expose.push(split[0])
        }

        // Environment variables
        if (!organ.environment) organ.environment = [];
        var envVars = common.stringifyObjects(inspectData.Config.Env);
        _.forEach(envVars, function (env) {
          organ.environment.push(env);
        });

        // Labels
        if (!organ.labels) organ.labels = [];
        var labels = common.stringifyObjects(inspectData.Config.Labels);
        _.forEach(labels, function (lab) {
          organ.environment.push(lab);
        });

        // Sets the status to ready as soon as image is ready on docker swarm
        organ.ready = true;
        organ.save();
        resolve();
      }
    })
  });
}
