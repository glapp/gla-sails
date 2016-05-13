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
            Cell.update({id: container.cell_id}, update, done)
          })
        }, function (err, cellArray) {
          if (err) return reject(err);
          resolve(cellArray);
        });
      });
    });
  }
};
