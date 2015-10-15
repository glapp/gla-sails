/**
 * Install bower components.
 *
 * ---------------------------------------------------------------
 *
 * Installs bower components and copies the required files into the assets folder structure.
 *
 */

var path = require('path');

module.exports = function (grunt) {

  grunt.config.set('bower', {
    install: {
      options: {
        targetDir: './assets/vendor',
        layout: function (type, component, source) {
          if (component == 'sails.io.js') return 'sails-io-js';
          if (component == 'vex') return 'vex';
          var pathc = path.parse(source);
          return path.normalize(pathc.dir);
        },
        install: true,
        verbose: false,
        cleanTargetDir: true,
        cleanBowerDir: true,
        bowerOptions: {}
      }
    }
  });

  grunt.loadNpmTasks('grunt-bower-task');
};
