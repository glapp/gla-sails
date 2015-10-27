/**
 * ApplicationController
 *
 * @description :: Server-side logic for managing Applications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	getUserApps: function(req, res) {
    Application.find({ owner: req.session.me }, function(err, apps) {
      if (err) res.notFound();
      res.ok(apps);
    })
  },

  addApplication: function(req, res) {
    Application.create({ owner: req.session.me, name: req.param('name')}, function(err, created) {
      if (err) res.badRequest();
      res.ok(created);
    })
  }
};

