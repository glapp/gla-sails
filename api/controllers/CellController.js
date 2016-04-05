/**
 * CellController
 *
 * @description :: Server-side logic for managing cells
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var _ = require('lodash');

module.exports = {

  move: function (req, res) {
    var cell_id = req.param('component_id');
    var opts = req.param('options');

    Cell.findOne({id: cell_id})
      .populate('node')
      .exec(function (err, cell) {
        if (err) throw err;
        //if (component.node.name == goal_node) {
        //  res.badRequest('Goal node is identical to current node!');
        //  return;
        //}

        var oldNode = cell.node ? cell.node.name : 'NoOldNodeFound!';

        // If hard requirement of node is given
        if (opts.node) {
          DockerService.moveContainer(cell, {environment: ['constraint:node==' + opts.node]})
            .then(function (result) {
              AppLog.create({
                application_id: cell.application_id,
                content: 'Moved ' + cell.originalName + ' from ' + oldNode + ' to ' + opts.node + '.'
              }).exec(function (err, created) {
                if (err) console.error('Couldn\'t create log! ', err);
                res.ok(result);
              })
            })
            .catch(function (err) {
              AppLog.create({
                application_id: cell.application_id,
                content: 'Failed to move ' + cell.originalName + '.'
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
          DockerService.moveContainer(cell, {environment: environment})
            .then(function (result) {
              var newNode = result.node;
              AppLog.create({
                application_id: cell.application_id,
                content: 'Moved ' + cell.originalName + ' from ' + oldNode + ' to ' + newNode + '.'
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

