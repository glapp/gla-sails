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

var debug = 1;

module.exports = {

  move: function(req, res) {
    var component_id = req.param('component_id');
    var goal_node = req.param('goal_node');

    Component.findOne({id: component_id}, function(err, component) {
      if (err) throw err;
      if (component.node == goal_node) {
        res.badRequest('goal node is identical to current node!');
        return;
      }
      var exposed = {};
      var portBindings = {};

      if (component.ports) {
        for (var i = 0; i < component.ports.length; i++) {
          var split = component.ports[i].split(":");
          if (split[1]) {
            exposed[split[1] + "/tcp"] = {};
            portBindings[split[1] + "/tcp"] = [{
              HostPort: split[0]
            }];
          } else {
            exposed[split[0] + "/tcp"] = {};
          }
        }
      }

      if (component.environment) {
        component.environment.push('constraint:node==' + goal_node);
      } else {
        component.environment = ['constraint:node==' + goal_node];
      }

      docker.createContainer({
        Image: component.image,
        name: component.name + '_temp',
        Env: component.environment,
        ExposedPorts: exposed,
        HostConfig: {
          PortBindings: portBindings,
        }
      }, function (err, container) {
        if (err) throw err;
        var old_name = docker.getContainer(component.name);
        old_name.inspect(function(err, data) {
          if (err) throw err;
          console.log(JSON.stringify(data));
          container.start(function(err) {
            if (err) throw err;
            Application.findOne({id: component.application_id}, function(err, app) {
              if (err) throw err;
              var network = docker.getNetwork(app.networkId);
              network.connect({
                container: container.id
              }, function (err) {
                if (err) throw err;
                var old = docker.getContainer(data.Id);
                old.rename({name: component.name + '_old'}, function(err) {
                  if (err) throw err;
                  container.rename({name: component.name}, function(err) {
                    if (err) throw err;
                    old.remove({force: true}, function(err) {
                      if (err) throw err;
                      container.inspect(function(err, data) {
                        if (err) throw err;
                        Component.update({id: component.id}, {node: data.Node.Name}, function(err, result) {
                          if (err) throw err;
                          res.ok(result);
                        });
                      });
                    })
                  })
                });
              });
            })
          });
        });
      });
    })
  },

  /*
  buildFromGitRepo: function (req, res) {

    var app_id = req.param('app_id');
    var gitUrl = req.param('gitUrl');

    console.log('---------> DEBUG: Starting git clone');

    var regex = /((git|ssh|http(s)?)|(git@[\w\.]+))(:(\/\/)?)(([\w\.@:\/\-~]+\/)+)([\w\.@:\/\-~]+)(\.git)(\/)?/;
    var result = gitUrl.match(regex);

    if (!result || !result[9]) {
      res.badRequest('invalid git url');
      return;
    }

    var name = result[9];
    var path = require("path").join('.tmp', name);

    // Promisified process
    clone(gitUrl, path, null)
      .then(function (repo) {
        console.log('Cloning finished.');
        res.ok();
        return makeTar(name, path)
      })
      .then(buildDockerImage)
      .then(function () {
        // everything done, clean up .tmp
        cleanUp(path);
      })
      .catch(function (err) {
        console.log('--> ERROR', err);
        res.serverError(err);
        cleanUp(path);
      });
  }
};

var makeTar = function (name, path) {
  return new Promise(function (resolve, reject) {
    fs.stat(path + '/Dockerfile', function (err, stat) {
      if (err == null) {
        console.log('File exists');
      } else if (err.code == 'ENOENT') {
        fs.writeFile(path + '/Dockerfile',
          "FROM gliderlabs/herokuish\n" +
          "COPY . /app\n" +
          "RUN herokuish buildpack build && export PORT=5000\n" +
          "EXPOSE 5000\n" +
          "CMD [\"/start\", \"web\"]",
          function (err) {
            if (err) return console.log('Write error: ', err);
          }
        );
      } else {
        //console.log('Some other error with Dockerfile: ', err.code);
        reject('Some other error with Dockerfile: ', err.code);
        return;
      }

      // Dockerfile exists

      // Make tar
      tar.pack(path).pipe(fs.createWriteStream(path + '.tar'))
        .on('finish', function () {
          //buildDockerImage(name, path);
          resolve([name, path]);
        });
    });
  });

};

var buildDockerImage = function (result) {
  console.log(arguments);
  var name = result[0];
  var path = result[1];

  //[name, path] = result;

  return new Promise(function (resolve, reject) {
    var repoName = 'glapp/' + name + ':1.0';
    console.log(repoName);
    // Build image
    docker.buildImage(path + '.tar', {t: repoName}, function (err, stream) {
      if (err) {
        //console.error(err);
        reject(err);
        return;
      }
      docker.modem.followProgress(stream, onFinished, onProgress);

      function onFinished(err, output) {
        var image = docker.getImage(repoName);
        resolve();
      }

      function onProgress(event) {
        console.log(event);
      }
    });
  });*/
};

var cleanUp = function (path) {
  rimraf(path, function (err) {
    if (err) throw err;
    fs.unlink(path + '.tar', function (err) {
      if (err) throw err;
      console.log('Cleaned up.');
    })
  })
};
