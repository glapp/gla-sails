/**
 * OrganController
 *
 * @description :: Server-side logic for managing Organs
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var _ = require('lodash');

module.exports = {
  scaleUp: function (req, res) {
    var organ_id = req.param('organ_id');
    var opts = {};

    Organ.findOne({id: organ_id}, function (err, organ) {
      if (err) return res.serverError(err);

      // TODO: Handle opts, e.g. for environment

      DockerService.scaleUp(organ, opts)
        .then(function (newCell) {
          AppLog.create({
            application_id: organ.application_id,
            content: 'Scaled up ' + organ.originalName + '.'
          }).exec(function (err, created) {
            if (err) console.error('Couldn\'t create log! ', err);
            res.ok(newCell);
          })
        })
        .catch(function (err) {
          AppLog.create({
            application_id: organ.application_id,
            content: 'Failed to scale up ' + organ.originalName + '.'
          }).exec(function (logErr, created) {
            if (err) console.error('Couldn\'t create log! ', logErr);
            res.serverError(err);
          });
        })
    })
  },

  scaleDown: function (req, res) {
    var organ_id = req.param('organ_id');
    var cell_id = req.param('cell_id');

    Organ.findOne({id: organ_id})
      .populate('cells')
      .exec(function (err, organ) {
        if (err) return res.serverError(err);

        var cell = _.find(organ.cells, {id: cell_id});

        // Find out whether scaling down is possible
        var nonProxies = _.filter(organ.cells, {isProxy: false});

        if (nonProxies.length > 1) {
          if (!cell) { // If no cell_id is given, take the first cell
            cell = nonProxies[0];
          }
          DockerService.removeContainer(cell)
            .then(function () {
              Cell.destroy({id: cell_id}, function(err) {
                if (err) return res.serverError(err);
                AppLog.create({
                  application_id: organ.application_id,
                  content: 'Scaled down ' + organ.originalName + '.'
                }).exec(function (err, created) {
                  if (err) console.error('Couldn\'t create log! ', err);
                  res.ok();
                })
              })
            })
            .catch(function (err) {
              AppLog.create({
                application_id: organ.application_id,
                content: 'Failed to scale down ' + organ.originalName + '.'
              }).exec(function (logErr, created) {
                if (err) console.error('Couldn\'t create log! ', logErr);
                res.serverError(err);
              });
            })
        } else {
          res.badRequest('Only one cell left, scaling down is not possible.')
        }
      })
  }
};
