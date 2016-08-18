/**
 * Created by isler on 07.12.2015.
 */

var initialization = require('./docker/initialization.js');
var deployment = require('./docker/deployment.js');
var infrastructure = require('./docker/infrastructure.js');
var adaptations = require('./docker/adaptations.js');
var common = require('./docker/common.js');


module.exports = {

  // Initialization
  checkCertsPath: initialization.checkCertsPath,
  swarm: initialization.swarm,
  obtainConsulIp: initialization.obtainConsulIp,
  extractComponents: initialization.extractComponents,
  createComponents: initialization.createComponents,

  // Deployment
  handleNetwork: deployment.handleNetwork,
  deploy: deployment.deploy,
  createContainer: deployment.createContainer,
  createProxyContainer: deployment.createProxyContainer,

  // Adaptions
  moveContainer: adaptations.moveContainer,
  scaleUp: adaptations.scaleUp,
  removeContainer: adaptations.removeContainer,
  removeAppCells: adaptations.removeAppCells,

  // Infrastructure
  getHostInfo: infrastructure.getHostInfo,
  initializeNodes: infrastructure.initializeNodes,

  // Diverse
  getCompleteAppData: common.getCompleteAppData

};
