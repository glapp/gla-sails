/**
 * Created by isler on 05.07.2016.
 */

var request = require('request');
var _ = require('lodash');

module.exports = {

  fetchData: function (metric, cells, timespan) {
    return new Promise(function (resolve, reject) {
      var url = 'http://' + sails.config.PROMETHEUS_URL + '/api/v1/query?query=';

      url += metric + '{id=~"';

      _.forEach(cells, function (cell) {
        url += '/docker/' + cell.container_id + '|';
      });

      url = url.replace(/\|$/g, ''); // Removes the '|' at the end
      url += '"}[' + timespan + ']';

      console.log('url:', url);
      request(url, function (err, response, body) {
        if (err) return reject(err);
        resolve(JSON.parse(body));
      })
    });
  },

  average: function (body) {
    return new Promise(function (resolve, reject) {
      if (!body.data || !body.data.result) return reject(new Error('No data found'));
      var allValues = [];
      _.forEach(body.data.result, function (cellData) {
        _.forEach(cellData.values, function (dataPair) {
          dataPair[0] = Math.ceil(dataPair[0] / 5) * 5;
          var existingIndex = _.findIndex(allValues, function (entry) {
            return entry.timestamp == dataPair[0];
          });
          var newValue = parseFloat(dataPair[1]);
          if (existingIndex && existingIndex > -1) {
            allValues[existingIndex].values.push(newValue);
          } else {
            allValues.push({timestamp: dataPair[0], values: [newValue]})
          }
        })
      });

      var result = [];

      _.forEach(allValues, function (valueObject) {
        var value = _.mean(valueObject.values);
        result.push({timestamp: valueObject.timestamp, value: value})
      });

      result = _.orderBy(result, ['timestamp'], ['desc']);

      resolve(result);
    })
  }
};

