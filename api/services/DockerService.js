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
  },


  createComponents: function (path, components, user_id, app_id) {
    return new Promise(function (resolve, reject) {
      var result = [];
      async.each(components, function (component, done) {
        var tag = user_id + '/' + app_id + '/' + component.name;
        async.series([
          function (finished) {
            // If we have to build the image first
            if (!component.image && component.build) {
              component.image = tag;
              var buildpath = require('path').join(path, component.build);
              // Make tar
              tar.pack(buildpath).pipe(fs.createWriteStream(buildpath + '.tar'))
                .on('finish', function () {
                  DockerService.docker.buildImage(buildpath + '.tar', {t: component.image}, function (err, stream) {
                    if (err) throw err;

                    DockerService.docker.modem.followProgress(stream, onFinished, onProgress);

                    function onProgress(event) {
                      console.log(_.values(event));
                    }

                    function onFinished(err, output) {
                      if (err) throw err;
                      // Sets the status to ready as soon as image is ready on docker swarm
                      Component.findOrCreate(component, component, function (err, result) {
                        if (err) throw err;
                        result.ready = true;
                        result.save();
                      });
                    }
                  });
                  // Callback outside the build function to make it build in the background
                  finished();
                })
                .on('error', function (err) {
                  throw err;
                });
              // If the image has to be pulled
            } else if (component.image && !component.build) {
              var image = DockerService.docker.getImage(component.image);
              image.inspect(function (err, inspectData) {
                if (err && err.statusCode != 404) throw err;
                if (err && err.statusCode == 404) {  // Image is not pulled yet -> Pull
                  DockerService.docker.pull(component.image, function (err, stream) {
                    if (err) throw err;

                    DockerService.docker.modem.followProgress(stream, onFinished, onProgress);

                    function onProgress(event) {
                      console.log(_.values(event));
                    }

                    function onFinished(err, output) {
                      if (err) throw err;

                      console.log(JSON.stringify(output));
                      var newImage = DockerService.docker.getImage(component.image);
                      newImage.inspect(function (err, inspectData) {
                        if (err) throw err;
                        console.log('--> Inspect data:', inspectData);

                        Component.findOrCreate(component, component, function (err, result) {
                          if (err) throw err;
                          // Sets the status to ready as soon as image is ready on docker swarm
                          result.ready = true;
                          // TODO: Set properties based on the image information (e.g., exposed ports, used volumes, etc.)
                          // result.imageId = data.Id;
                          result.save();
                        });
                      });
                    }
                  });
                  // Callback outside the pull function to make it pull in the background
                  finished();
                } else { // Image is already pulled
                  console.log(JSON.stringify('--> Inspect Data', inspectData));

                  Component.findOrCreate(component, component, function (err, result) {
                    if (err) throw err;
                    // Sets the status to ready as soon as image is ready on docker swarm
                    result.ready = true;
                    // TODO: Set properties based on the image information (e.g., exposed ports, used volumes, etc.)
                    // result.imageId = data.Id;
                    result.save();
                    finished();
                  });
                }
              });

            } else {
              throw 'Build / Image attributes not valid';
            }
          },
          function (finished) {
            Component.findOrCreate(component, component, function (err, created) {
              if (err) throw err;
              result.push(created);
              finished();
            })
          }
        ], function (err, results) {
          if (err) throw err;
          done();
        });
      }, function (err) {
        if (err) reject(err);
        else resolve(result);
      });
    })
  },

  handleNetwork: function(app) {
    return new Promise(function (resolve, reject) {
      var notReady = _.some(app.components, {ready: false});
      if (notReady) {
        reject('At least one component is not ready yet.');
      } else {
        DockerService.docker.createNetwork({
          Name: app.owner + '_' + app.id
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

  deploy: function(app, network) {
    return new Promise(function (resolve, reject) {
      var result = [];
      async.each(app.components, function (component, done) {
        var exposed = {};
        var portBindings = {};

        if (component.ports) {
          for (var i = 0; i < component.ports.length; i++) {
            var split = component.ports[i].split(":");
            if (split[1]) {
              exposed[split[1] + "/tcp"] = {};
              portBindings[split[1] + "/tcp"] = [{
                HostPort: split[0]
              }];
            } else {
              exposed[split[0] + "/tcp"] = {};
            }
          }
        }

        DockerService.docker.createContainer({
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
            console.log('CONTAINER', container);

            container.inspect(function (err, inspectData) {
              if (err) throw err;
              Component.update({id: component.id}, {node: inspectData.Node.Name}, function (err, updated) {
                if (err) throw err;
                result.push(updated);
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
          }
        });
      }, function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      })
    });
  }
};
