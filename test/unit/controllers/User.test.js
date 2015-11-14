/**
 * Created by isler on 12-Nov-15.
 */
var request = require('supertest');
var expect = require('chai').expect;

describe('UserController', function () {

  describe('When signing up', function () {
    it('should sign up', function (done) {
      request(sails.hooks.http.app)
        .post('/signup')
        .send({email: 'signup@test.com', password: 'test'})
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.contain.keys('id');
          done();
        });
    });
  });

  describe('When being logged in', function () {
    var Cookies;

    // Logging in
    before(function (done) {
      request(sails.hooks.http.app)
        .put('/login')
        .send({email: 'signup@test.com', password: 'test'})
        .end(function(err, res) {
          Cookies = res.headers['set-cookie'].pop().split(';')[0];
          done();
        })
    });

    it('should confirm being logged in', function (done) {
      var req = request(sails.hooks.http.app).get('/confirm-login');

      req.cookies = Cookies;
      req
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.contain.keys('id');
          done();
        })
    });

    it('should log out', function (done) {
      var req = request(sails.hooks.http.app).get('/logout');
      req.cookies = Cookies;
      req
        .expect(200, done)
    });
  });

  describe('When not being logged in', function () {
    it('should not log in', function (done) {
      request(sails.hooks.http.app)
        .put('/login')
        .send({email: 'not.existing@test.com', password: 'test'})
        .expect(404, done)
    });

    it('should log in', function (done) {
      request(sails.hooks.http.app)
        .put('/login')
        .send({email: 'signup@test.com', password: 'test'})
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.contain.keys('id');
          done();
        });
    });

    it('should confirm not being logged in', function (done) {
      request(sails.hooks.http.app)
        .get('/confirm-login')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.not.contain.keys('id');
          done();
        })
    });
  });
});
