/**
 * Created by isler on 13.05.2016.
 */
var fs = require('fs');
var async = require('async');
var _ = require('lodash');

var common = require('./common.js');

module.exports = {
  // TODO: clean old nodes
  getHostInfo: function () {
    return new Promise(function (resolve, reject) {
      DockerService.swarm.info(function (err, data) {
        if (err) reject(err);
        else {
          console.log(data);
          data.SystemStatus = parseSystemStatus(data);

          async.map(data.SystemStatus.Hosts, function (host, done) {
            Host.update({name: host.name}, host, function (err, entry) {
              if (err && err.status == 404) { // New node!
                Host.create(host, function (err, newEntry) {
                  if (err) done(err);
                  else done(null, newEntry);
                })
              } else if (err) {
                done(err);
              } else {
                done(null, entry[0])
              }
            });
          }, function (err, result) {
            if (err) reject(err);
            else {
              var names = _.map(result, 'name');
              Host.find({name: names})
                .populate('cells')
                .then(function (result) {
                  resolve(result);
                })
                .catch(function (err) {
                  reject(err);
                });
            }
          })
        }
      })
    })
  },

  initializeNodes: function () {
    return new Promise(function (resolve, reject) {
      DockerService.swarm.info(function (err, data) {
        if (err) reject(err);
        else {
          data.SystemStatus = parseSystemStatus(data);

          async.map(data.SystemStatus.Hosts, function (host, done) {
            Host.create(host, function (err, entry) {
              if (err) done(err);
              else done(null, entry)
            });
          }, function (err, result) {
            if (err) reject(err);
            else resolve(result);
          })
        }
      })
    })
  }
};

function parseSystemStatus(data) {
  var systemStatus = {};
  systemStatus.Hosts = [];
  var current = 0;
  for (var i = 0; i < data.SystemStatus.length; i++) {
    // Check for node name
    var match_name = data.SystemStatus[i][0].match(/^ +([a-zA-Z0-9]+.+)/);
    var match_attr = data.SystemStatus[i][0].match(/^ +└ +(.+)/);
    if (match_name) {
      var split = data.SystemStatus[i][1].split(':');

      current = systemStatus.Hosts.length;
      systemStatus.Hosts.push({
        name: match_name[1],
        ip: split[0]
      });
    } else if (match_attr) {
      var key = normalizeKey(match_attr[1]);
      if (match_attr[1] == 'Labels') {
        var split = data.SystemStatus[i][1].split(', ');
        data.SystemStatus[i][1] = common.objectifyStrings(split)
      }
      if (systemStatus.Hosts[current]) {
        systemStatus.Hosts[current][key] = data.SystemStatus[i][1];
      } else {
        systemStatus[key] = data.SystemStatus[i][1];
      }
    } else {
      var key = normalizeKey(data.SystemStatus[i][0]);
      systemStatus[key] = data.SystemStatus[i][1];
    }
  }
  return systemStatus;
}

function normalizeKey(str) {
  return (str.substr(0, 1).toLowerCase() + str.substr(1)).replace(' ', '')
}
