/**
 * Created by Fabio-local on 13.11.2015.
 */
/**
 * Created by isler on 12-Nov-15.
 */
var request = require('supertest');
var expect = require('chai').expect;
require('./User.test.js');

describe('ApplicationController', function () {

  describe('When a user is signed in', function () {
    var Cookies;

    // Logging in
    before(function (done) {
      request(sails.hooks.http.app)
        .put('/login')
        .send({email: 'signup@test.com', password: 'test'})
        .end(function (err, res) {
          Cookies = res.headers['set-cookie'].pop().split(';')[0];
          done();
        })
    });

    it('should get no application', function (done) {
      var req = request(sails.hooks.http.app).get('/getUserApps');
      req.cookies = Cookies;
      req
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.be.empty;
          done();
        })
    });

    it('should add an application', function (done) {
      var req = request(sails.hooks.http.app);
      req.cookies = Cookies;
      req
        .post('/app')
        .send({name: 'testapp'})
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.contain.keys('id');
          done();
        });
    });
  });
});
