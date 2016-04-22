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
      //.populate('rules')
      .exec(function (err, rules) {
        if (err) res.notFound();
        else res.json({rules: rules});
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
            //console.log(entry);

            entry.operator = rule.operator;
            entry.value = rule.value;

            // For each organ ID, add the corresponding organ to the association
            rule.organs.forEach(function (organ) {
              console.log(organ.organ_id);
              entry.organ.add(organ.organ_id);
            })

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

