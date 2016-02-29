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
