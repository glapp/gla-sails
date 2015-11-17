/**
 * Created by isler on 12-Nov-15.
 */
var request = require('supertest');
var expect = require('chai').expect;

var agent;

describe('UserController', function () {
  describe('When signing up', function () {
    it('should sign up', function (done) {
      agent = request.agent(sails.hooks.http.app);

      agent
        .post('/signup')
        .send({email: 'signup@test.com', password: 'test'})
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.contain.keys('id');
          done();
        });
    });

    it('should log out', function(done) {
      agent
        .get('/logout')
        .expect(200, done);
    })
  });

  describe('When being logged in', function () {
    // Logging in
    before(function (done) {
      agent
        .put('/login')
        .send({email: 'test@test.com', password: 'password'})
        .end(function(req, res) {
          done();
        })
    });

    it('should confirm being logged in', function (done) {
      agent
        .get('/confirm-login')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.contain.keys('id');
          done();
        })
    });

    it('should log out', function (done) {
      agent
        .get('/logout')
        .expect(200, done)
    });
  });

  describe('When not being logged in', function () {
    it('should not log in', function (done) {
      agent
        .put('/login')
        .send({email: 'not.existing@test.com', password: 'test'})
        .expect(404, done)
    });

    it('should confirm not being logged in', function (done) {
      agent
        .get('/confirm-login')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.not.contain.keys('id');
          done();
        })
    });

    it('should log in', function (done) {
      agent
        .put('/login')
        .send({email: 'test@test.com', password: 'password'})
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.contain.keys('id');
          done();
        });
    });

    it('should confirm being logged in', function (done) {
      agent
        .get('/confirm-login')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.contain.keys('id');
          done();
        })
    });
  });
});
