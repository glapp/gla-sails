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

        var oldNode = component.node ? component.node.name : 'NoOldNodeFound!';

        // If hard requirement of node is given
        if (opts.node) {
          DockerService.moveContainer(component, {environment: ['constraint:node==' + opts.node]})
            .then(function (result) {
              AppLog.create({
                application_id: component.application_id,
                content: 'Moved ' + component.originalName + ' from ' + oldNode + ' to ' + opts.node + '.'
              }).exec(function (err, created) {
                if (err) console.error('Couldn\'t create log! ', err);
                res.ok(result);
              })
            })
            .catch(function (err) {
              AppLog.create({
                application_id: component.application_id,
                content: 'Failed to move ' + component.originalName + '.'
              }).exec(function (err, created) {
                if (err) console.error('Couldn\'t create log! ', err);
                res.serverError(err);
              })
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
              var newNode = result.node;
              AppLog.create({
                application_id: component.application_id,
                content: 'Moved ' + component.originalName + ' from ' + oldNode + ' to ' + newNode + '.'
              }).exec(function (err, created) {
                if (err) console.error('Couldn\'t create log! ', err);
                res.ok(result);
              })
            })
            .catch(function (err) {
              res.serverError(err);
            });
        }
      });
  }
};
