/**
 * OrganController
 *
 * @description :: Server-side logic for managing Organs
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  scaleUp: function (req, res) {
    var organ_id = req.param('organ_id');
    var opts = {};

    Organ.findOne({id: organ_id}, function (err, organ) {
      if (err) return res.serverError(err);

      // TODO: Handle opts, e.g. for environment

      DockerService.scaleUp(organ, opts)
        .then(function(newCell) {
          AppLog.create({
            application_id: organ.application_id,
            content: 'Scaled up ' + organ.originalName + '.'
          }).exec(function (err, created) {
            if (err) console.error('Couldn\'t create log! ', err);
            res.ok(newCell);
          })
        })
        .catch(function(err) {
          res.serverError(err);
        })
    })
  }
};
