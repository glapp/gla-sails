/**
 * ComponentController
 *
 * @description :: Server-side logic for managing Components
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var clone = require("nodegit").Clone.clone;
var fs = require('fs');
var tar = require('tar-fs');
var rimraf = require('rimraf');

module.exports = {

  move: function (req, res) {
    var component_id = req.param('component_id');
    var goal_node = req.param('goal_node');

    Component.findOne({id: component_id})
      .populate('node')
      .exec(function (err, component) {
      if (err) throw err;
      if (component.node.name == goal_node) {
        res.badRequest('Goal node is identical to current node!');
        return;
      }

      DockerService.moveContainer(component, {environment: ['constraint:node==' + goal_node]})
        .then(function (result) {
          res.ok(result);
        })
        .catch(function (err) {
          res.serverError(err.json);
        });
    });
  }
};
