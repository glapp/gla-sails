/**
 * PrometheusController
 *
 * @description :: Server-side logic for managing Prometheus queries
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var cpuMetric = 'container_cpu_usage_seconds_total';

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

        PrometheusService.fetchData(cpuMetric, organ.cells, timespan)
          .then(PrometheusService.average)
          .then(function(result) {
            res.ok(result);
          }).catch(function(err) {
            res.serverError(err);
          });
      })
      .catch(function (err) {
        res.serverError(err);
      })
    ;
  }
};

