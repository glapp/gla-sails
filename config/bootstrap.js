/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html
 */

module.exports.bootstrap = function(cb) {
  // It's very important to trigger this callback method when you are finished
  // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
  DockerService.checkCertsPath()
    .then(DockerService.initializeNodes)
    .then(function(result) {
      console.log('Initialized the following nodes:');
      for (var i in result) {
        console.info('- ' + result[i].name);
      }
      return DockerService.obtainConsulIp();
    })
    .then(function(url) {
      if (url) {
        sails.config.CONSUL_URL = url;
        console.log('set consul url to ' + url + '.');

        // Also set Prometheus URL, assuming it's on the same host

        var base = url.match(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g)[0];
        console.log('base url is ' + base + '.');
        var prometheusHost = process.env.PROMETHEUS_HOST || base;
        var prometheusPort = process.env.PROMETHEUS_PORT || '19090';
        sails.config.PROMETHEUS_URL = process.env.PROMETHEUS_URL || prometheusHost + ':' + prometheusPort;

        var metricsHost = process.env.METRICS_HOST || base;
        var metricsPort = process.env.METRICS_PORT || '9090';
        sails.config.METRICS_URL = process.env.METRICS_URL || metricsHost + ':' + metricsPort;
      } else {
        console.info('Couldn\'t obtain Consul IP nor Prometheus URL - make sure you provided it via CONSUL_URL environment variable');
      }
      cb();
    })
    .catch(function(err) {
      throw err;
    })
};
