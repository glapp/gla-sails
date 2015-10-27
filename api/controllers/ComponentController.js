/**
 * ComponentController
 *
 * @description :: Server-side logic for managing Components
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var async = require('async');

module.exports = {
	uploadZipFile: function(req, res) {
    req.file('components').upload({
      // don't allow the total upload size to exceed ~10MB
      // maxBytes: 10000000
    },function whenDone(err, uploadedFiles) {
      if (err) {
        return res.negotiate(err);
      }

      // If no files were uploaded, respond with an error.
      if (uploadedFiles.length === 0){
        return res.badRequest('No file was uploaded');
      }

      async.each(uploadedFiles, function(file, save) {

      })
    });
  }
};

