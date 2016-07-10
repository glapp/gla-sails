/**
 * OrganController
 *
 * @description :: Server-side logic for managing Organs
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var _ = require('lodash');

module.exports = {

  getCellInfo: function (req, res) {
    Cell
      .find()
      .populate('organ_id')
      .populate('host')
      .exec(function (err, cells) {
        if (err) res.notFound();
        else res.json({cells: cells});
      })
  },

  scaleUp: function (req, res) {
    var organ_id = req.param('organ_id');
    var opts = req.param('options');

    Organ.findOne({id: organ_id}, function (err, organ) {
      if (err) return res.serverError(err);

      var environment = [];

      // Add constraints
      _.forEach(opts, function (value, key) {
        if (value != '') {
          environment.push('constraint:' + key + '==' + value);
        }
      });

      DockerService.scaleUp(organ, {environment: environment})
        .then(function (newCell) {
          AppLog.create({
            application_id: organ.application_id,
            content: 'Scaled up ' + organ.originalName + '.',
            type: 'info',
            name: 'scaleUp'
          }).exec(function (err, created) {
            if (err) console.error('Couldn\'t create log! ', err);
            res.ok(newCell);
          })
        })
        .catch(function (err) {
          AppLog.create({
            application_id: organ.application_id,
            content: 'Failed to scale up ' + organ.originalName + '.',
            type: 'error',
            name: 'scaleUp'
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
                  content: 'Scaled down ' + organ.originalName + '.',
                  type: 'info',
                  name: 'scaleDown'
                }).exec(function (err, created) {
                  if (err) console.error('Couldn\'t create log! ', err);
                  res.ok();
                })
              })
            })
            .catch(function (err) {
              AppLog.create({
                application_id: organ.application_id,
                content: 'Failed to scale down ' + organ.originalName + '.',
                type: 'error',
                name: 'scaleDown'
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
