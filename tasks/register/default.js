module.exports = function (grunt) {
	grunt.registerTask('default', ['bower', 'compileAssets', 'linkAssets',  'watch']);
};
