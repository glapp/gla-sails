/**
 * ComponentController
 *
 * @description :: Server-side logic for managing Components
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var _ = require('lodash');

module.exports = {

  move: function (req, res) {
    var component_id = req.param('component_id');
    var opts = req.param('options');

    Component.findOne({id: component_id})
      .populate('node')
      .exec(function (err, component) {
        if (err) throw err;
        //if (component.node.name == goal_node) {
        //  res.badRequest('Goal node is identical to current node!');
        //  return;
        //}

        if (opts.node) {
          DockerService.moveContainer(component, {environment: ['constraint:node==' + goal_node]})
            .then(function (result) {
              res.ok(result);
            })
            .catch(function (err) {
              res.serverError(err.json);
            });
        } else {
          var environment = [];

          // Add constraints
          _.forEach(opts, function (value, key) {
            if (value != '') {
              environment.push('constraint:' + key + '==' + value);
            }
          });

          // Move
          DockerService.moveContainer(component, {environment: environment})
            .then(function (result) {
              res.ok(result);
            })
            .catch(function (err) {
              res.serverError(err.json);
            });
        }
      });
  }
};
