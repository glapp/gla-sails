/**
 * ConstraintController
 *
 * @description :: Server-side logic for managing Constraints
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var async = require('async');

module.exports = {
  // function to get the rules of a specific application
  getRules: function (req, res) {
    var application_id = req.param('app_id');

    Rule.find({application_id: application_id})
      .populate('organs')
      .exec(function (err, rules) {
        if (err) return res.notFound();

        //console.log(rules);

        res.ok({rules: rules});
      })
  },

  removeRules: function (req, res) {
    var ids = req.param('ids');
    Rule.destroy(ids)
      .exec(function (err, destroyed) {
        if (err) return res.serverError(err);

        res.ok();
      })
  },

  // function to set the rules of a specific application
  setRules: function (req, res) {
    var application_id = req.param('app_id');
    var policy = req.param('rules');

    async.each(policy, function (rule, done) {
      Rule.findOrCreate({application_id: application_id, metric: rule.metric})
        .populate('organs')
        .exec(function (err, entry) {
          if (err) done(err);
          else {
            entry.operator = rule.operator;
            entry.value = rule.value;
            entry.weight = rule.weight;

            rule.organs.forEach(function (organ) {
              console.log('Organ ID: ' + organ.organ_id);

              entry.organs.add(organ.organ_id);
            });

            entry.save(function (err) {
              done(err);
            });
          }
        });
    }, function onFinished(err) {
      if (err) res.serverError(err);
      else res.ok();
    });
  }
};

