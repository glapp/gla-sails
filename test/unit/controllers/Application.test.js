/**
 * Created by Fabio-local on 13.11.2015.
 */
/**
 * Created by isler on 12-Nov-15.
 */
var request = require('supertest');
var expect = require('chai').expect;

var agent;

describe('ApplicationController', function () {

  describe('When a user is signed in', function () {
    var Cookies;

    // Logging in
    before(function (done) {
      agent = request.agent(sails.hooks.http.app);
      agent
        .put('/login')
        .send({email: 'test@test.com', password: 'password'})
        .end(function (err, res) {
          done();
        })
    });

    it('should get pre-filled application', function (done) {
      agent
        .get('/getUserApps')
        .expect(200)
        .end(function (err, res) {
          if (err) throw err;
          expect(res.body).to.have.length(1);
          expect(res.body[0].name).to.equal('TestApplication');
          done();
        })
    });

    it('should add an application', function (done) {
      agent
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
