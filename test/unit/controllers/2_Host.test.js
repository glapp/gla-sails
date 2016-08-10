/**
 * Created by isler on 10.08.2016.
 */

var request = require('supertest');
var expect = require('chai').expect;

var agent;
var appId;

describe('HostController', function () {

  // Logging in
  before(function (done) {
    agent = request.agent(sails.hooks.http.app);
    agent
      .put('/user/login')
      .send({email: 'test@test.com', password: 'password'})
      .end(function (err, res) {
        done(err);
      })
  });

  describe('When the user logs in', function () {

    it('should find information about the hosts', function (done) {
      agent
        .get('/host/info')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          // TODO: Add some checks
          done();
        })
    });
  });

  describe('When MAPE asks for the host information', function () {

    it('should find information about the hosts', function (done) {
      agent
        .get('/host/infoMape')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          // TODO: Add some checks
          done();
        })
    });
  });
});
