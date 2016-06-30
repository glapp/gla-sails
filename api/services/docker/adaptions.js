/**
 * Created by isler on 13.05.2016.
 */

var _ = require('lodash');

var common = require('./common.js');

module.exports = {

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

          copy.environment = _.extend(cell.environment, organ.environment);

          // Create the new container
          DockerService.createContainer(copy)
            .then(function (newContainer) {

              // Start the new container
              newContainer.start(function (err) {
                if (err) return reject(err);

                var old = DockerService.swarm.getContainer(old_id);

                // Remove old container
                old.remove({force: true}, function (err) {
                  if (err) return reject(err);

                  var created = DockerService.swarm.getContainer(newContainer.id);

                  created.cell_id = cell.id;

                  // Complete cell information
                  common.completeCells([created])
                    .then(function (result) {
                      resolve(result[0]);
                    })
                    .catch(reject);
                });

              });
            })
            .catch(function (err) {
              reject(err);
            })
        })
    });
  },

  scaleUp: function (organ, opts) {
    return new Promise(function (resolve, reject) {

      var copy = _.extend({}, organ);

      copy.environment = _.extend(organ.environment, opts.environment);

      // Create cell database entry
      Cell.create({organ_id: organ.id}, function (err, cell) {
        if (err) return reject(err);

        DockerService.createContainer(copy)
          .then(function (newContainer) {

            // Start the new container
            newContainer.start(function (err) {
              if (err) return reject(err);

              var created = DockerService.swarm.getContainer(newContainer.id);

              created.cell_id = cell.id;

              // Complete cell information
              common.completeCells([created])
                .then(function (result) {
                  resolve(result[0]);
                })
                .catch(reject);
            });
          })
          .catch(function (err) {
            reject(err);
          })
      });
    });
  },

  removeContainer: function (cell) {
    return new Promise(function (resolve, reject) {

      var container = DockerService.swarm.getContainer(cell.container_id);

      // Remove old container
      container.remove({force: true}, function (err) {
        if (err) return reject(err);
        else resolve();
      });
    });
  },

  removeAppCells: function (app) {
    return new Promise(function (resolve, reject) {
      async.each(app.organs, function (organ, organDone) {
        async.each(organ.cells, function (cell, cellDone) {
          DockerService.removeContainer(cell)
            .then(cellDone)
            .catch(cellDone);
        }, function onCellsDone(err) {
          organDone(err);
        });
      }, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};
