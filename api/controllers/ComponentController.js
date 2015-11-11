/**
 * ComponentController
 *
 * @description :: Server-side logic for managing Components
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var clone = require("nodegit").Clone.clone;
var fs = require('fs');
var Docker = require('dockerode');
var tar = require('tar-fs');

var debug = 1;

var docker = new Docker({
  host: '192.168.33.10',
  port: process.env.DOCKER_PORT || 4243,
});

module.exports = {
  buildFromGitRepo: function (req, res) {

    var app_id = req.param('app_id');
    var gitUrl = req.param('gitUrl');

    console.log('---------> DEBUG: Starting git clone');

    var regex = /((git|ssh|http(s)?)|(git@[\w\.]+))(:(\/\/)?)(([\w\.@:\/\-~]+\/)+)([\w\.@:\/\-~]+)(\.git)(\/)?/;
    var result = gitUrl.match(regex);

    if (!result[9]) {
      res.badRequest('invalid git url');
      return;
    }

    var name = result[9];
    var path = require("path").join('.tmp', name);


    clone(gitUrl, path, null)
      .then(function (repo) {
        console.log('Cloning finished.');
        res.ok();
        makeTar(name, path)
      })
      .catch(function (err) {
        console.log('--> ERROR', err);
        res.serverError(err);
      });


    //});
  }
};

var makeTar = function (name, path) {
  console.log('---------> DEBUG: git clone successful');

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
      console.log('Some other error with Dockerfile: ', err.code);
      return;
    }

    // Dockerfile exists

    // Make tar
    tar.pack(path).pipe(fs.createWriteStream(path + '.tar'))
      .on('finish', function () {
        console.log('---------> DEBUG ULTIMATE');
        buildDockerImage(name, path);
      });
  });
};

var buildDockerImage = function (name, path) {
  var repoName = 'glapp/' + name + ':1.0';
  console.log(repoName);
  // Build image
  docker.buildImage(path + '.tar', {t: repoName}, function (err, stream) {
    if (err) {
      console.error(err);
      return;
    }
    docker.modem.followProgress(stream, onFinished, onProgress);

    function onFinished(err, output) {
      //output is an array with output json parsed objects
      //...
    }

    function onProgress(event) {
      console.log(event);
    }

    /*console.log('trying to build ' + repoName + ' from tar ' + path + '.tar');
     if (err) {
     console.log('--------------> ERROR:', err);
     }
     console.log(response);*/
  });
};
