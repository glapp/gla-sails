/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
  * etc. depending on your default view engine) your home page.              *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/


  /***************************************************************************
  *                                                                          *
  * Custom routes here...                                                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the custom routes above, it   *
  * is matched against Sails route blueprints. See `config/blueprints.js`    *
  * for configuration options and examples.                                  *
  *                                                                          *
  ***************************************************************************/

  // User enrollment + authentication
  'POST /user/signup': 'UserController.signup',
  'PUT /user/login': 'UserController.login',
  'GET /user/logout': 'UserController.logout',
  'GET /user/confirm-login': 'UserController.confirmLogin',

  // Application
  'GET /application/getUserApps': 'ApplicationController.getUserApps',
  'GET /application/details': 'ApplicationController.getAppDetails',
  'POST /application/add': 'ApplicationController.addApplication',
  'POST /application/remove': 'ApplicationController.remove',
  'POST /application/deploy': 'ApplicationController.deploy',
  'POST /application/undeploy': 'ApplicationController.undeploy',
  'POST /application/rename': 'ApplicationController.rename',
  'GET /application/getAppInfo': 'ApplicationController.getAppInfo',

  // Cell
  'POST /cell/move': 'CellController.move',

  // Organ
  // TODO: change here and in MAPE to '/organ/getCellInfo
  'GET /application/getCellInfo': 'OrganController.getCellInfo',
  'POST /organ/scaleUp': 'OrganController.scaleUp',
  'POST /organ/scaleDown': 'OrganController.scaleDown',

  // Host
  'GET /host/info': 'HostController.getHostInfo',
  'GET /host/infoMape': 'HostController.getHostInfoMape',
  'GET /host/prometheusUrl': 'HostController.getPrometheusUrl',

  // Policy
  'GET /policy': 'RuleController.getRules',
  'POST /policy/set': 'RuleController.setRules',
  'POST /policy/remove': 'RuleController.removeRules',

  // Analytics queries
  'GET /analytics/organCpu': 'AnalyticsController.getOrganCpu',
  'GET /analytics/organMemory': 'AnalyticsController.getOrganMemory',
  'GET /analytics/events': 'AnalyticsController.getEvents'

};
