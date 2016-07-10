/**
 * Analytics Controller
 *
 * @description :: Server-side logic for managing Analytics
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var cpuMetric = 'container_cpu_usage_seconds_total';
var memoryMetric = 'container_memory_usage_bytes';

module.exports = {

  getOrganCpu: function (req, res) {
    var organ_id = req.param('organ_id');
    var timespan = req.param('timespan');

    var correctTimespan = /^[1-9][0-9]*[s|m|h|d|w|y]$/g.test(timespan);
    if (!correctTimespan) return res.badRequest('Invalid timespan');

    Organ.findOne({id: organ_id})
      .populate('cells')
      .then(function (organ) {
        if (!organ || !organ.cells || organ.cells.length == 0) return res.badRequest('Invalid organ id');
        return PrometheusService.fetchData(cpuMetric, organ.cells, timespan)
      })
      .then(PrometheusService.average)
      .then(function(result) {
        res.ok(result);
      })
      .catch(function(err) {
      res.serverError(err);
    });
  },

  getOrganMemory: function(req, res) {
    var organ_id = req.param('organ_id');
    var timespan = req.param('timespan');

    var correctTimespan = /^[1-9][0-9]*[s|m|h|d|w|y]$/g.test(timespan);
    if (!correctTimespan) return res.badRequest('Invalid timespan');

    Organ.findOne({id: organ_id})
      .populate('cells')
      .then(function (organ) {
        if (!organ || !organ.cells || organ.cells.length == 0) return res.badRequest('Invalid organ id');
        return PrometheusService.fetchData(memoryMetric, organ.cells, timespan)
      })
      .then(PrometheusService.average)
      .then(function(result) {
        res.ok(result);
      })
      .catch(function(err) {
        res.serverError(err);
      });
  },

  getEvents: function(req, res) {
    var app_id = req.param('app_id');

    AppLog.find({application_id: app_id})
      .sort('createdAt DESC')
      .exec(function(err, events) {
        if (err) return res.serverError(err);
        res.ok(events);
      })
  }
};

