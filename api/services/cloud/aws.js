/**
 * Created by isler on 10.6.2016.
 */
var AWS = require('aws-sdk');

var EC2_uswest = new AWS.EC2({
  region: 'us-west-1'
});



module.exports = {

  create: function (consul_url, tier, region) {
    return new Promise(function (resolve, reject) {

    });
  }
};
