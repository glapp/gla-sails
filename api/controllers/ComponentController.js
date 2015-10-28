/**
 * ComponentController
 *
 * @description :: Server-side logic for managing Components
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var fs = require('fs');
var fstream = require('fstream');
var Docker = require('dockerode');
var tar = require('tar');

var docker = new Docker(/*{
  host: '192.168.99.100',
  port: process.env.DOCKER_PORT || 2375,
}*/);

module.exports = {
  cloneGitRepo: function (req, res) {

    var app_id = req.param('app_id');
    var gitUrl = req.param('gitUrl');
    // workaround until nodegit package is working for windows 10
    var exec = require('child_process').exec;
    exec('cd .tmp && git clone ' + gitUrl, function (error, stderr, stdout) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
        res.serverError();
      }

      var index = gitUrl.lastIndexOf("/") + 1;
      var path = '.tmp/' + gitUrl.substr(index);

      fs.stat(path + '/Dockerfile', function (err, stat) {
        if (err == null) {
          console.log('File exists');
        } else if (err.code == 'ENOENT') {
          fs.writeFile(path  + '/Dockerfile',
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
          console.log('Some other error: ', err.code);
          res.serverError();
        }

        // Dockerfile exists

        // Make tar
        var dirDest = fs.createWriteStream(path + '.tar');

        function onError(err) {
          console.error('An error occurred:', err)
        }

        function onEnd() {
          console.log('Packed!')
        }

        var packer = tar.Pack({ noProprietary: true })
          .on('error', onError)
          .on('end', onEnd);

        // This must be a "directory"
        fstream.Reader({ path: path, type: "Directory" })
          .on('error', onError)
          .pipe(packer)
          .pipe(dirDest);

        // Build image
        docker.buildImage(path + '.tar', {t: 'glapp/' + path}, function(err, response) {
          if (err) console.log(err);
          console.log(response);
          res.ok();
        });

        res.serverError();
      });
    })
  }
};
