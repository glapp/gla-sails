/**
 * Created by isler on 07.12.2015.
 */
var Docker = require('dockerode');
var fs = require('fs');

module.exports = new Docker({
  host: sails.config.SWARM_HOST || 'localhost',
  port: sails.config.SWARM_PORT || 3376,
  ca: fs.readFileSync(sails.config.DOCKER_CERT_PATH + '/ca.pem'),
  cert: fs.readFileSync(sails.config.DOCKER_CERT_PATH + '/cert.pem'),
  key: fs.readFileSync(sails.config.DOCKER_CERT_PATH + '/key.pem')
});
