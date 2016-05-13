/**
 * Created by isler on 07.12.2015.
 */

var initialization = require('./docker/initialization.js');
var deployment = require('./docker/deployment.js');
var infrastructure = require('./docker/infrastructure.js');
var adaptions = require('./docker/adaptions.js');

module.exports = {

  // Initialization
  docker: initialization.docker,
  extractComponents: initialization.extractComponents,
  createComponents: initialization.createComponents,

  // Deployment
  handleNetwork: deployment.handleNetwork,
  deploy: deployment.deploy,
  createContainer: deployment.createContainer,
  createProxyContainer: deployment.createProxyContainer,

  // Adaptions
  moveContainer: adaptions.moveContainer,

  // Infrastructure
  getHostInfo: infrastructure.getHostInfo,
  initializeNodes: infrastructure.initializeNodes

};
