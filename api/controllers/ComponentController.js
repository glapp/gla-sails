/**
 * ComponentController
 *
 * @description :: Server-side logic for managing Components
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var fs = require('fs');
var fstream = require('fstream');
var Docker = require('dockerode');
var tar = require('tar-fs');
var async = require('async');

var debug = 1;

var docker = new Docker({
  host: '192.168.33.10',
  port: process.env.DOCKER_PORT || 4243,
});

module.exports = {
  cloneGitRepo: function (req, res) {

    var app_id = req.param('app_id');
    var gitUrl = req.param('gitUrl');

    // workaround until nodegit package is working for windows 10
    var exec = require('child_process').exec;

    console.log('---------> DEBUG: Starting git clone');

    exec('cd .tmp && git clone ' + gitUrl, function (error, stderr, stdout) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
        res.serverError();
      }
      res.ok();

      console.log('---------> DEBUG: git clone successful');

      var index = gitUrl.lastIndexOf("/") + 1;
      var name = gitUrl.substr(index);
      var path = '.tmp/' + name;

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
          .on('finish', function() {
            console.log('---------> DEBUG ULTIMATE');
            buildDockerImage(name, path);
          });

        /*
        var dirDest = fs.createWriteStream(path + '.tar')
          .on('finish', function() {
            console.log('---------> DEBUG ULTIMATE');


          });


        function onError(err) {
          console.error('An error occurred:', err);
        }

        var packer = tar.Pack({noProprietary: true})
          .on('error', onError)
          .on('end', function () {
            console.log('Packed!')
          });

        console.log('---------> DEBUG: Starting to pack');

        // This must be a "directory"
        fstream.Reader(path + '/')
          .on('error', onError)
          .pipe(packer)
          .pipe(dirDest)*/
      });
    });
  }
};


var buildDockerImage = function(name, path) {
  var repoName = 'glapp/' + name + ':1.0';
  console.log(repoName);
  // Build image
  docker.buildImage(path + '.tar', {t: repoName}, function (err, response) {
    console.log('trying to build ' + repoName + ' from tar ' + path + '.tar');
    if (err) {
      console.log('--------------> ERROR:', err);
    }
    console.log(response);
  });
};
