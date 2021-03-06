/**
 * NodeController
 *
 * @description :: Server-side logic for managing Nodes
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  getHostInfo: function (req, res) {
    var user_id;

    if (req.session.me) {
      user_id = req.session.me;
    } else {
      res.forbidden();
      return;
    }


    DockerService.getHostInfo()
      .then(function (data) {
        res.ok(data);
      })
      .catch(function (err) {
        res.serverError(err);
      })
  },

  getHostInfoMape: function (req, res) {
    DockerService.getHostInfo()
      .then(function (data) {
        res.ok({hosts: data});
      })
      .catch(function (err) {
        res.serverError(err);
      })
  },

  getPrometheusUrl: function(req, res) {
    if (!sails.config.PROMETHEUS_URL) return res.notFound();
    res.ok({prometheusUrl: sails.config.PROMETHEUS_URL});
  }
};
