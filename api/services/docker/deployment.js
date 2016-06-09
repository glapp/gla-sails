/**
 * Created by isler on 13.05.2016.
 */
var fs = require('fs');
var async = require('async');
var _ = require('lodash');

var proxy_image = 'clabs/haproxylb';
var proxy_image_tag = '0.7';

var common = require('./common.js');

module.exports = {
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

  deploy: function (app) {
    return new Promise(function (resolve, reject) {
      var createdContainers = [];
      async.each(app.organs, function (organ, done) {

        // Create cell database entry
        Cell.create({organ_id: organ.id}, function (err, cell) {
          if (err) return done(err);

          // Create the container on the swarm
          DockerService.createContainer(organ)
            .then(function (container) {

              // start the container
              container.start(function (err) {
                if (err) return done(err);

                container.cell_id = cell.id;
                createdContainers.push(container);

                if (organ.expose || organ.ports) {
                  Cell.create({organ_id: organ.id, isProxy: true}, function (err, proxyCell) {
                    if (err) return done(err);

                    DockerService.createProxyContainer(organ)
                      .then(function (newProxy) {
                        newProxy.start(function (err) {
                          if (err) return done(err);

                          // Keep the information about the corresponding cell
                          newProxy.cell_id = proxyCell.id;
                          createdContainers.push(newProxy);
                          done();
                        })
                      })
                      .catch(function (err) {
                        done(err);
                      });
                  })

                } else {
                  done();
                }
              })
            })
            .catch(function (err) {
              console.error(err);
              done(err);
            })
        })
      }, function (err) {
        if (err) {
          console.error(err);
          return reject(err);
        }

        // Handle the created proxies
        common.completeCells(createdContainers)
          .then(function (result) {
            resolve();
          })
          .catch(function (err) {
            reject(err);
          });
      });
    });
  },

  createContainer: function (organ) {
    return new Promise(function (resolve, reject) {
      var exposed = {};
      //var portBindings = {};

      // Add exposed ports
      _.forEach(organ.expose, function (port) {
        exposed[port + "/tcp"] = {};
      });

      // Add published ports, assign them to random host port
      _.forEach(organ.ports, function (port) {
        // portBindings[port + "/tcp"] = [{
        //   HostPort: null // to get random port
        // }];
        exposed[port + "/tcp"] = {};
      });

      var objectifiedLabels = common.objectifyStrings(organ.labels);

      // TODO: Create volumes

      organ.environment.push('SERVICE_NAME=' + organ.id);

      DockerService.docker.createContainer({
        Image: organ.image,
        //name: organ.name,
        Env: organ.environment,
        Labels: objectifiedLabels,
        ExposedPorts: exposed,
        HostConfig: {
          //PortBindings: portBindings,
          NetworkMode: organ.application_id
        }
      }, function (err, container) {
        if (err) reject(err);
        else resolve(container);
      });
    })
  },

  createProxyContainer: function (organ) {
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

      // Environment
      var environment = [
        'APP_NAME=' + organ.id,
        'CONSUL_URL=' + sails.config.CONSUL_URL,
        'PORT_NUMBER=' + organ.expose[0]
      ];

      DockerService.docker.createContainer({
        Image: proxy_image + ':' + proxy_image_tag,
        name: organ.name,
        Env: environment,
        ExposedPorts: exposed,
        HostConfig: {
          PortBindings: portBindings,
          NetworkMode: organ.application_id
        }
      }, function (err, container) {
        if (err) reject(err);
        else resolve(container);
      });
    })
  }
};