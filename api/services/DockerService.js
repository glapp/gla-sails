/**
 * Created by isler on 07.12.2015.
 */
var Docker = require('dockerode');
var fs = require('fs');
var yaml = require('yamljs');
var async = require('async');
var tar = require('tar-fs');
var _ = require('lodash');

module.exports = {
  docker: new Docker({
    host: sails.config.SWARM_HOST || 'localhost',
    port: sails.config.SWARM_PORT || 3376,
    ca: fs.readFileSync(sails.config.DOCKER_CERT_PATH + '/ca.pem'),
    cert: fs.readFileSync(sails.config.DOCKER_CERT_PATH + '/cert.pem'),
    key: fs.readFileSync(sails.config.DOCKER_CERT_PATH + '/key.pem')
  }),

  extractComponents: function (path, app_id) {
    return new Promise(function (resolve, reject) {
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

        // Read docker-compose file
        var components = yaml.load(path + '/docker-compose.yml');
        console.log(JSON.stringify(components));

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
          components[c].environment = stringifyObjects(components[c].environment);

          // Stringify labels
          components[c].labels = stringifyObjects(components[c].labels);

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
        _.map(components, function (component) {
          var newEnvironment = [];
          _.forEach(component.environment, function (env) {
            for (var newName in regex) {
              env = env.replace(regex[newName], "=" + newName)
            }
            newEnvironment.push(env);
          });
          component.environment = newEnvironment;
          return component;
        });

        resolve(components);
      });
    });
  },

  createComponents: function (path, components) {
    return new Promise(function (resolve, reject) {
      async.each(components, function (component, done) {
        var tag = component.name;
        var changed = false;
        if (!component.image) {
          component.image = tag;
          changed = true;
        }

        // Create database entry
        Component.create(component, component, function (err, created) {
          if (err) return done(err);

          // If we have to build the image first
          if (changed && component.build) {
            var buildpath = require('path').join(path, component.build);
            // Make tar
            tar.pack(buildpath).pipe(fs.createWriteStream(buildpath + '.tar'))
              .on('finish', function () {
                DockerService.docker.buildImage(buildpath + '.tar', {t: component.image}, function (err, stream) {
                  if (err) return done(err);

                  DockerService.docker.modem.followProgress(stream, onFinished, onProgress);

                  function onProgress(event) {
                    console.log(_.values(event));
                  }

                  function onFinished(err, output) {
                    if (err) return done(err);
                    completeParameters(created)
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
          } else if (component.image && !component.build) {
            var image = DockerService.docker.getImage(component.image);
            image.inspect(function (err, inspectData) {
              if (err && err.statusCode != 404) return done(err);
              if (err && err.statusCode == 404) {  // Image is not pulled yet -> Pull
                DockerService.docker.pull(component.image, function (err, stream) {
                  if (err) return done(err);

                  DockerService.docker.modem.followProgress(stream, onFinished, onProgress);

                  function onProgress(event) {
                    console.log(_.values(event));
                  }

                  function onFinished(err, output) {
                    if (err) return done(err);
                    completeParameters(created)
                      .then(done)
                      .catch(function (err) {
                        done(err);
                      });
                  }
                });
              } else { // Image is already pulled
                completeParameters(created)
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

  handleNetwork: function (app) {
    return new Promise(function (resolve, reject) {
      var notReady = _.some(app.components, {ready: false});
      if (notReady) {
        reject('At least one component is not ready yet.');
      } else {
        DockerService.docker.createNetwork({
          Name: app.id
        }, function (err, network) {
          if (err) {
            reject(err);
            return;
          }
          app.networkId = network.id;
          app.save();
          resolve(network);
        })
      }
    });
  },

  deploy: function (app, network) {
    return new Promise(function (resolve, reject) {
      async.each(app.components, function (component, done) {

        DockerService.createContainer(component)
          .then(function (container) {
            console.log('CONTAINER', container);

            container.inspect(function (err, inspectData) {
              if (err) throw err;

              console.log('---------------> Inspect data:\n', inspectData);

              Component.update({id: component.id}, {
                node_name: inspectData.Node.Name,
                node_ip: inspectData.Node.IP
              }, function (err, updated) {
                if (err) throw err;
                container.start(function (err) {
                  if (err) throw err;
                  network.connect({
                    container: container.id
                  }, function (err) {
                    if (err) throw err;
                    done();
                  });
                })
              })
            });
          })
          .catch(function (err) {
            console.log(err);
            done(err);
          });
      }, function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      })
    });
  },

  createContainer: function (component) {
    return new Promise(function (resolve, reject) {
      var exposed = {};
      var portBindings = {};

      // Add exposed ports
      _.forEach(component.expose, function (port) {
        exposed[port + "/tcp"] = {};
      });

      // Add published ports, assign them to random host port
      _.forEach(component.ports, function (port) {
        portBindings[port + "/tcp"] = [{
          HostPort: null // to get random port
        }];
        exposed[port + "/tcp"] = {};
      });

      var objectifiedLabels = objectifyStrings(component.labels);

      // TODO: Create volumes

      DockerService.docker.createContainer({
        Image: component.image,
        name: component.name,
        Env: component.environment,
        Labels: objectifiedLabels,
        ExposedPorts: exposed,
        HostConfig: {
          PortBindings: portBindings,
        },
      }, function (err, container) {
        if (err) reject(err);
        else resolve(container);
      });
    })
  },

  moveContainer: function (component, opts) {
    return new Promise(function (resolve, reject) {

      // Add environment opts, delete previous ones
      _.each(opts.environment, function (optEnv) {
        var optSplit = optEnv.split('=');
        _.remove(component.environment, function (compEnv) {
          var compSplit = compEnv.split('=');
          return compSplit[0] == optSplit[0];
        });
        component.environment.push(optEnv);
      });

      // Save component
      component.save();

      var copy = _.extend({}, component);
      copy.name = component.name + "_temp";

      DockerService.createContainer(copy)
        .then(function (newContainer) {
          newContainer.start(function (err) {
            if (err) return reject(err);
            Application.findOne({id: component.application_id}, function (err, app) {
              if (err) return reject(err);
              var network = DockerService.docker.getNetwork(app.networkId);
              network.connect({
                container: newContainer.id
              }, function (err) {
                if (err) return reject(err);
                DockerService.docker.getContainer(component.name).inspect(function (err, data) {
                  if (err) return reject(err);
                  var old = DockerService.docker.getContainer(data.Id);
                  old.rename({name: component.name + '_old'}, function (err) {
                    if (err) return reject(err);
                    newContainer.rename({name: component.name}, function (err) {
                      if (err) return reject(err);
                      old.remove({force: true}, function (err) {
                        if (err) return reject(err);
                        DockerService.docker.getContainer(component.name).inspect(function (err, data) {
                          if (err) return reject(err);
                          Component.update({id: component.id}, {
                            node_name: data.Node.Name,
                            node_ip: data.Node.IP
                          }, function (err, result) {
                            if (err) return reject(err);
                            resolve(result);
                          });
                        });
                      })
                    })
                  });
                });
              });
            })
          });
        })
        .catch(function (err) {
          reject(err);
        })
    });
  },

  getNodeInfo: function () {
    return new Promise(function (resolve, reject) {
      DockerService.docker.info(function (err, data) {
        if (err) reject(err);
        else {
          var systemStatus = {};
          systemStatus.Hosts = [];
          var current = 0;
          for (var i = 0; i < data.SystemStatus.length; i++) {
            console.log(systemStatus);
            // Check for node name
            var match_name = data.SystemStatus[i][0].match(/^ +([a-zA-Z0-9]+.+)/);
            var match_attr = data.SystemStatus[i][0].match(/^ +└ +(.+)/);
            if (match_name) {
              current = systemStatus.Hosts.length;
              systemStatus.Hosts.push({
                Name: match_name[1],
                Ip: data.SystemStatus[i][1]
              });
            } else if (match_attr) {
              if (match_attr[1] == 'Labels') {
                var split = data.SystemStatus[i][1].split(', ');
                data.SystemStatus[i][1] = objectifyStrings(split)
              }
              if (systemStatus.Hosts[current]) {
                systemStatus.Hosts[current][match_attr[1]] = data.SystemStatus[i][1];
              } else {
                systemStatus[match_attr[1]] = data.SystemStatus[i][1];
              }
            } else {
              systemStatus[data.SystemStatus[i][0]] = data.SystemStatus[i][1];
            }
          }

          data.SystemStatus = systemStatus;

          resolve(data);
        }
      })
    })
  }
};

function escapeRegExp(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function stringifyObjects(element) {
  if ((typeof element === "object") && !Array.isArray(element) && (element !== null)) {
    var adjustedElement = [];
    for (var e in element) {
      if (element[e] == null || element[e] === "") {
        adjustedElement.push(e);
      } else {
        adjustedElement.push(e + "=" + element[e]);
      }
    }
    return adjustedElement;
  } else {
    return element;
  }
}

function objectifyStrings(element) {
  if ((Array.isArray(element)) && (element !== null)) {
    var adjustedElement = {};
    _.forEach(element, function (e) {
      var split = e.split('=');
      adjustedElement[split[0]] = split[1] ? split[1] : null;
    });
    return adjustedElement;
  } else {
    return element;
  }
}

function completeParameters(component) {
  return new Promise(function (resolve, reject) {
    var newImage = DockerService.docker.getImage(component.image);
    newImage.inspect(function (err, inspectData) {
      if (err) reject(err);
      else {
        // Exposed ports
        if (!component.expose) component.expose = [];
        for (var attr in inspectData.Config.ExposedPorts) {
          var split = attr.split('/');
          component.expose.push(split[0])
        }

        // Environment variables
        if (!component.environment) component.environment = [];
        var envVars = stringifyObjects(inspectData.Config.Env);
        _.forEach(envVars, function (env) {
          component.environment.push(env);
        });

        // Labels
        if (!component.labels) component.labels = [];
        var labels = stringifyObjects(inspectData.Config.Labels);
        _.forEach(labels, function (lab) {
          component.environment.push(lab);
        });

        console.log('Inspect data of image:');
        console.log(inspectData);
        // Sets the status to ready as soon as image is ready on docker swarm
        component.ready = true;
        component.save();
        resolve();
      }
    })
  });
}


// TODO: Extend this conceptual idea of reverse proxies
function addReverseProxy(component) {
  return new Promise(function (resolve, reject) {
    var dir = require('path').join('/tmp', component.name);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    fs.writeFile(require('path').join(dir, 'nginx.conf'),
      'http {\n' +
      'upstream proxy-' + component.name + '{\n' +
      'server ' + component.name + ':80;\n' +
      '}\n' +

      'server {\n' +
      'listen 80;\n' +

      'location / {\n' +
      "proxy_pass http://proxiedweb;\n" +
      "proxy_http_version 1.1;\n" +
      "proxy_set_header Upgrade $http_upgrade;\n" +
      "proxy_set_header Connection 'upgrade';\n" +
      "proxy_set_header Host $host;\n" +
      "proxy_cache_bypass $http_upgrade;\n" +
      '}\n' +
      '}\n' +
      '}\n'
      , function (err) {
        if (err) {
          return reject(err);
        }

        console.log("The file was saved!");
      });

  })
}
