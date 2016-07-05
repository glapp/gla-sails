/**
 * PrometheusController
 *
 * @description :: Server-side logic for managing Prometheus queries
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var request = require('request');
var _ = require('lodash');

var cpuMetric = 'container_cpu_usage_seconds_total'

module.exports = {

  getOrganCpu: function (req, res) {
    var organ_id = req.param('organ_id');
    var timespan = req.param('timespan');

    console.log('organ_id', organ_id, 'timespan', timespan);
    var correctTimespan = /^[1-9][0-9]*[s|m|h|d|w|y]$/g.test(timespan);
    if (!correctTimespan) return res.badRequest('Invalid timespan');

    Organ.findOne({id: organ_id})
      .populate('cells')
      .then(function (organ) {
        if (!organ || !organ.cells || organ.cells.length == 0) return res.badRequest('Invalid organ id');

        fetchData(cpuMetric, organ.cells, timespan)
          .then(function (body) {


            res.ok(body);
          })
          .catch(function(err) {
            res.serverError(err);
          });
      })
      .catch(function (err) {
        res.serverError(err);
      })
    ;


  }

};

var fetchData = function(metric, cells, timespan) {
  return new Promise(function(resolve, reject) {
    // TODO: If it gets too complex, put this code into PrometheusService
    var url = 'http://' + sails.config.PROMETHEUS_URL + '/api/v1/query?query=';

    url += metric + '{id=~"';

    _.forEach(cells, function (cell) {
      url += '/docker/' + cell.container_id + '|';
    });

    url = url.replace(/\|$/g, ''); // Removes the '|' at the end
    url += '"}[' + timespan + ']';

    console.log('url:', url);
    request(url, function (err, response, body) {
      if (err) return reject(err);
      console.log(response);
      console.log(body);
      resolve(JSON.parse(body));
    })
  });
};

