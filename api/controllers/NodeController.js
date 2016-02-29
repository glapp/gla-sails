/**
 * NodeController
 *
 * @description :: Server-side logic for managing Nodes
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var async = require('async');
var _ = require('lodash');

module.exports = {
  getNodeInfo: function (req, res) {
    //var user_id;
    //
    //if (req.session.me) {
    //  user_id = req.session.me;
    //} else {
    //  res.forbidden();
    //  return;
    //}

    DockerService.getNodeInfo()
      .then(function (data) {
        async.map(data.SystemStatus.Hosts, function (node, done) {
          node = _.mapKeys(node, function(value, key) {
            var result = key.substr(0, 1).toLowerCase() + key.substr(1);
            return result.replace(' ', '');
          });
          Node.findOrCreate(node, function(err, saved) {
            if (err) done(err);
            else done(null, saved)
          });
        }, function(err, result) {
          if (err) res.serverError(err);
          else res.ok(result);
        });
      })
      .catch(function (err) {
        res.serverError(err);
      })
  }
};
