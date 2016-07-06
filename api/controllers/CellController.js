/**
 * CellController
 *
 * @description :: Server-side logic for managing cells
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var _ = require('lodash');

module.exports = {

  move: function (req, res) {
    var cell_id = req.param('cell_id');
    var opts = req.param('options');

    Cell.findOne({id: cell_id})
      .populate('host')
      .exec(function (err, cell) {
        if (err) throw err;
        //if (component.node.name == goal_node) {
        //  res.badRequest('Goal node is identical to current node!');
        //  return;
        //}

        Organ.findOne({id: cell.organ_id}).exec(function (err, organ) {
          if (err) return res.serverError(err);

          var oldNode = cell.host ? cell.host.name : 'NoOldNodeFound!';

          // If hard requirement of node is given
          // if (opts.host) {
            // DockerService.moveContainer(cell, {environment: ['constraint:node==' + opts.node]})
            //   .then(function (result) {
            //     AppLog.create({
            //       application_id: organ.application_id,
            //       content: 'Moved ' + organ.originalName + ' from ' + oldNode + ' to ' + opts.node + '.',
            //       type: 'info',
            //       name: 'move'
            //     }).exec(function (err, created) {
            //       if (err) console.error('Couldn\'t create log! ', err);
            //       res.ok(result);
            //     })
            //   })
            //   .catch(function (err) {
            //     AppLog.create({
            //       application_id: organ.application_id,
            //       content: 'Failed to move ' + organ.originalName + '.',
            //       type: 'error',
            //       name: 'move'
            //     }).exec(function (logErr, created) {
            //       if (logErr) console.error('Couldn\'t create log! ', logErr);
            //       res.serverError(err);
            //     })
            //   });
          // } else {
            var environment = [];

            // Add constraints
            _.forEach(opts, function (value, key) {
              if (value != '') {
                environment.push('constraint:' + key + '==' + value);
              }
            });

            // Move
            DockerService.moveContainer(cell, {environment: environment})
              .then(function (newCell) {
                var newNode = newCell.host;
                AppLog.create({
                  application_id: organ.application_id,
                  content: 'Moved ' + organ.originalName + ' from ' + oldNode + ' to ' + newNode + '.',
                  type: 'info',
                  name: 'move'
                }).exec(function (err, created) {
                  if (err) console.error('Couldn\'t create log! ', err);
                  res.ok(newCell);
                })
              })
              .catch(function (err) {
                AppLog.create({
                  application_id: organ.application_id,
                  content: 'Failed to move ' + organ.originalName + '.',
                  type: 'error',
                  name: 'move'
                }).exec(function (logErr, created) {
                  if (logErr) console.error('Couldn\'t create log! ', logErr);
                  res.serverError(err);
                })
              });
          // }
        })
      });
  }

};

