/**
 * Created by isler on 13.05.2016.
 */

var _ = require('lodash');


module.exports = {

  stringifyObjects: function stringifyObjects(element) {
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
  },

  objectifyStrings: function objectifyStrings(element) {
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
  },

  completeCells: function completeCells(containersArray) {
    return new Promise(function (resolve, reject) {

      DockerService.docker.listContainers(function (err, dockerInfo) {
        if (err) return reject(err);

        async.map(containersArray, function (container, done) {

          container.inspect(function (err, inspectData) {
            if (err) return done(err);

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
            Cell.update({id: container.cell_id}, update, function(err, updated) {
              done(null, updated[0]);
            })
          })
        }, function (err, cellArray) {
          if (err) return reject(err);
          resolve(cellArray);
        });
      });
    });
  },

  getCompleteAppData: function(app_id) {
    return new Promise(function(resolve, reject) {
      // TODO: Get complete app infos, including organ and cell details
      Application
        .findOne({id: app_id})
        .populate('log', {sort: 'createdAt DESC'})
        .populate('organs')
        .exec(function (err, app) {
          if (err) return reject(err);

          // TODO: With a future sails version, it will be possible to nest populations. This is a quite efficient workaround until then.

          Organ
            .find({id: _.map(app.organs, 'id')})
            .populate('cells')
            .populate('dependent_on')
            .exec(function (err, organs) {
              if (err) return reject(err);

              // TODO This is inefficient since it's querying the db for every organ -> nested population should fix this
              async.map(organs, function (organ, done) {
                Cell
                  .find({id: _.map(organ.cells, 'id')})
                  .populate('host')
                  .exec(function (err, cells) {
                    if (err) return done(err);

                    // TODO This is a workaround because somehow to send organ directly doesn't include the hosts of the cells
                    var newOrgan = _.extend({}, organ);
                    newOrgan.cells = cells;

                    done(null, newOrgan);
                  })
              }, function (err, newOrgans) {
                if (err) return reject(err);

                // TODO This is a workaround because somehow to send app directly doesn't include the cells of the organs
                var newApp = _.extend({}, app);
                newApp.organs = newOrgans;
                resolve(newApp);
              });
            });
        });
    });
  }
};
