/**
 * NodeController
 *
 * @description :: Server-side logic for managing Nodes
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  getNodeInfo: function (req, res) {
    var user_id;

    if (req.session.me) {
      user_id = req.session.me;
    } else {
      res.forbidden();
      return;
    }


    DockerService.getNodeInfo()
      .then(function (data) {
        res.ok(data);
      })
      .catch(function (err) {
        res.serverError(err);
      })
  },

  getDockerInfo: function(req, res) {
    DockerService.docker.listContainers(function(err, resp) {
      if (err) {
        res.serverError(err);
        return;
      }
      res.ok(resp);
    });
  }
};
