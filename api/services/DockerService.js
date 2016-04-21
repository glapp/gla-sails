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
          console.log('Found docker-compose.yml!');
        } else if (err.code == 'ENOENT') {
          // Doesn't exist yet
          console.log('No docker-compose file!');
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
            //Application.findOne({id: app_id})
              //.populate('organs')
              //.exec(function (err, app) {
                //if (err) return reject(err);

                async.each(organs, function(organ, done) {
                  //Organ.findOne(organ.id).exec(function(err, org) {
                    Organ.find({name: connections[organ.name]})
                      .populate('dependent_on')
                      .exec(function(err, conns) {
                      organ.dependent_on.add(_.map(conns, 'id'));
                      organ.save(done);
                    });
                  //});
                }, function(err) {
                  if (err) return reject(err);
                  Application.findOne({id: app_id})
                    .populate('organs')
                    .exec(function (err, completeApp) {
                      if (err) return reject(err);
                      resolve(completeApp);
                    })
                });
              //})
          }
        })
      });
    });
  },

  createComponents: function (path, app) {
    return new Promise(function (resolve, reject) {

      // TODO Create reverse proxy cell


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
                DockerService.docker.buildImage(buildpath + '.tar', {t: organ.image}, function (err, stream) {
                  if (err) return done(err);

                  DockerService.docker.modem.followProgress(stream, onFinished, onProgress);

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
            var image = DockerService.docker.getImage(organ.image);
            image.inspect(function (err, inspectData) {
              if (err && err.statusCode != 404) return done(err);
              if (err && err.statusCode == 404) {  // Image is not pulled yet -> Pull
                DockerService.docker.pull(organ.image, function (err, stream) {
                  if (err) return done(err);

                  DockerService.docker.modem.followProgress(stream, onFinished, onProgress);

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

  handleNetwork: function (app) {
    return new Promise(function (resolve, reject) {
      var notReady = _.some(app.organs, {ready: false});
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
      async.map(app.organs, function (organ, done) {

        // Create cell database entry
        Cell.create({organ_id: organ.id}, function (err, cell) {
          if (err) return done(err);

          // Create the container on the swarm
          DockerService.createContainer(organ)
            .then(function (container) {

              // start the container
              container.start(function (err) {
                if (err) return done(err);
                network.connect({
                  container: container.id
                }, function (err) {
                  if (err) return done(err);

                  // Keep the information about the corresponding cell
                  container.cell_id = cell.id;
                  done(null, container);
                });
              })
            })
            .catch(function (err) {
              console.log(err);
              done(err);
            })
        })
      }, function (err, containersArray) {
        if (err) {
          reject(err);
          return;
        }

        DockerService.docker.listContainers(function (err, dockerInfo) {
          if (err) {
            reject(err);
            return;
          }

          // Handle the created containers
          async.each(containersArray, function (container, done) {
            completeCell(container, dockerInfo)
              .then(function (result) {
                done();
              })
              .catch(function (err) {
                done(err);
              });
          }, function (err) {
            if (err) reject(err);
            else resolve();
          });
        });
      });
    });
  },

  createContainer: function (organ) {
    return new Promise(function (resolve, reject) {
      var exposed = {};
      var portBindings = {};

      // Add exposed ports
      _.forEach(organ.expose, function (port) {
        exposed[port + "/tcp"] = {};
      });

      // Add published ports, assign them to random host port
      _.forEach(organ.ports, function (port) {
        portBindings[port + "/tcp"] = [{
          HostPort: null // to get random port
        }];
        exposed[port + "/tcp"] = {};
      });

      var objectifiedLabels = objectifyStrings(organ.labels);

      // TODO: Create volumes

      DockerService.docker.createContainer({
        Image: organ.image,
        name: organ.name,
        Env: organ.environment,
        Labels: objectifiedLabels,
        ExposedPorts: exposed,
        HostConfig: {
          PortBindings: portBindings
        }
      }, function (err, container) {
        if (err) reject(err);
        else resolve(container);
      });
    })
  },

  moveContainer: function (cell, opts) {
    return new Promise(function (resolve, reject) {

      Organ
        .findOne({id: cell.organ_id})
        .exec(function (err, organ) {
          if (err) return res.serverError(err);

          // delete previous constraints
          _.remove(cell.environment, function (compEnv) {
            var re = /^constraint:.+=/g;
            return re.test(compEnv);
          });

          // Add environment opts
          _.forEach(opts.environment, function (optEnv) {
            cell.environment.push(optEnv);
          });

          // Save cell
          cell.save();

          var old_id = cell.container_id;

          var copy = _.extend({}, organ);

          copy.name = organ.name + "_temp";
          copy.environment = _.extend(cell.environment, organ.environment);

          // Create the new container
          DockerService.createContainer(copy)
            .then(function (newContainer) {

              // Start the new container
              newContainer.start(function (err) {
                if (err) return reject(err);

                // Find network
                Application.findOne({id: organ.application_id}, function (err, app) {
                  if (err) return reject(err);
                  var network = DockerService.docker.getNetwork(app.networkId);

                  // Connect new container to network
                  network.connect({
                    container: newContainer.id
                  }, function (err) {
                    if (err) return reject(err);

                    // Get old container
                    var old = DockerService.docker.getContainer(old_id);

                    // Rename old container
                    old.rename({name: organ.name + '_old'}, function (err) {
                      if (err) return reject(err);

                      // Rename new container to original name
                      newContainer.rename({name: organ.name}, function (err) {
                        if (err) return reject(err);

                        // Remove old container
                        old.remove({force: true}, function (err) {
                          if (err) return reject(err);

                          // Docker info for additional information
                          DockerService.docker.listContainers(function (err, dockerInfo) {
                            if (err) return reject(err);

                            var created = DockerService.docker.getContainer(newContainer.id);
                            if (err) return reject(err);

                            created.cell_id = cell.id;
                            // Complete cell information
                            completeCell(created, dockerInfo)
                              .then(resolve)
                              .catch(reject);
                          });
                        })
                      })
                    });
                  });
                })
              });
            })
            .catch(function (err) {
              reject(err);
            })
        })
    });
  },

  // TODO: clean old nodes
  getHostInfo: function () {
    return new Promise(function (resolve, reject) {
      DockerService.docker.info(function (err, data) {
        if (err) reject(err);
        else {
          console.log(data);
          data.SystemStatus = parseSystemStatus(data);

          async.map(data.SystemStatus.Hosts, function (host, done) {
            Host.update({name: host.name}, host, function (err, entry) {
              if (err && err.status == 404) { // New node!
                Host.create(host, function (err, newEntry) {
                  if (err) done(err);
                  else done(null, newEntry);
                })
              } else if (err) {
                done(err);
              } else {
                done(null, entry[0])
              }
            });
          }, function (err, result) {
            if (err) reject(err);
            else {
              var names = _.map(result, 'name');
              Host.find({name: names})
                .populate('cells')
                .then(function (result) {
                  resolve(result);
                })
                .catch(function (err) {
                  reject(err);
                });
            }
          })
        }
      })
    })
  },

  initializeNodes: function () {
    return new Promise(function (resolve, reject) {
      DockerService.docker.info(function (err, data) {
        if (err) reject(err);
        else {
          data.SystemStatus = parseSystemStatus(data);

          async.map(data.SystemStatus.Hosts, function (host, done) {
            Host.create(host, function (err, entry) {
              if (err) done(err);
              else done(null, entry)
            });
          }, function (err, result) {
            if (err) reject(err);
            else resolve(result);
          })
        }
      })
    })
  }
};

function completeCell(container, dockerInfo) {
  return new Promise(function (resolve, reject) {
    container.inspect(function (err, inspectData) {
      if (err) return reject(err);

      var ContainerInfo = _.find(dockerInfo, ['Id', container.id]);

      // ToDo: Support multiple published ports
      var publishedPort = ContainerInfo.Ports[0] ? ContainerInfo.Ports[0].PublicPort : null;

      var update = {
        host: inspectData.Node.Name,
        container_id: container.id
      };

      if (publishedPort) {
        update.published_port = publishedPort;
      }

      // Update database entry with node and ip
      Cell.update({id: container.cell_id}, update, function (err, updated) {
        if (err) reject(err);
        else resolve(updated[0]);
      })
    })
  });
}

function parseSystemStatus(data) {
  var systemStatus = {};
  systemStatus.Hosts = [];
  var current = 0;
  for (var i = 0; i < data.SystemStatus.length; i++) {
    // Check for node name
    var match_name = data.SystemStatus[i][0].match(/^ +([a-zA-Z0-9]+.+)/);
    var match_attr = data.SystemStatus[i][0].match(/^ +└ +(.+)/);
    if (match_name) {
      var split = data.SystemStatus[i][1].split(':');

      current = systemStatus.Hosts.length;
      systemStatus.Hosts.push({
        name: match_name[1],
        ip: split[0]
      });
    } else if (match_attr) {
      var key = normalizeKey(match_attr[1]);
      if (match_attr[1] == 'Labels') {
        var split = data.SystemStatus[i][1].split(', ');
        data.SystemStatus[i][1] = objectifyStrings(split)
      }
      if (systemStatus.Hosts[current]) {
        systemStatus.Hosts[current][key] = data.SystemStatus[i][1];
      } else {
        systemStatus[key] = data.SystemStatus[i][1];
      }
    } else {
      var key = normalizeKey(data.SystemStatus[i][0]);
      systemStatus[key] = data.SystemStatus[i][1];
    }
  }
  return systemStatus;
}

function normalizeKey(str) {
  return (str.substr(0, 1).toLowerCase() + str.substr(1)).replace(' ', '')
}

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

function completeParameters(organ) {
  return new Promise(function (resolve, reject) {
    var newImage = DockerService.docker.getImage(organ.image);
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
        var envVars = stringifyObjects(inspectData.Config.Env);
        _.forEach(envVars, function (env) {
          organ.environment.push(env);
        });

        // Labels
        if (!organ.labels) organ.labels = [];
        var labels = stringifyObjects(inspectData.Config.Labels);
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
