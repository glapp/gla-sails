/**
 * CellController
 *
 * @description :: Server-side logic for managing cells
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var _ = require('lodash');

var constraintCheck = /^constraint:.+=/g;

module.exports = {

  move: function (req, res) {
    var cell_id = req.param('cell_id');
    var opts = req.param('options');

    if (!cell_id) return res.badRequest('No cell id specified');
    if (!opts) return res.badRequest('No options given for movement');

    Cell.findOne({id: cell_id})
      .populate('host')
      .exec(function (err, cell) {
        if (err) throw err;
        if (!cell) return res.notFound('No cell found with id ' + cell_id);

        Organ.findOne({id: cell.organ_id}).exec(function (err, organ) {
          if (err) return res.serverError(err);
          if (!organ) return res.serverError('Couldn\'t find the organ of cell ' + cell_id);

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
          var cellEnvironment = [];

          // Add constraints
          _.forEach(opts, function (value, key) {
            if (value != '') {
              cellEnvironment.push('constraint:' + key + '==' + value);
            }
          });

          // Add environment opts
          cell.environment = cellEnvironment;
          // Save cell
          cell.save();

          // Remove previous constraints on the organ environment
          organ.environment = _.filter(organ.environment, function(env) {
            return !constraintCheck.test(env);
          });
          // Save organ
          organ.save();

          var newContainer = organ.toJSON();

          newContainer.environment = _.concat(cellEnvironment, newContainer.environment);
          newContainer.cell_id = cell.id;

          // Move
          DockerService.moveContainer(cell.container_id, newContainer)
            .then(function (movedCell) {
              var newNode = movedCell.host;
              AppLog.create({
                application_id: organ.application_id,
                content: 'Moved ' + organ.originalName + ' from ' + oldNode + ' to ' + newNode + '.',
                type: 'info',
                name: 'move'
              }).exec(function (err, created) {
                if (err) console.error('Couldn\'t create log! ', err);
                res.ok(movedCell);
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

