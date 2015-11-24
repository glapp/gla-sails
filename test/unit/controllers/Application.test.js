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
          expect(res.body).to.have.length(2);
          expect(res.body[0].name).to.equal('TestApplication');
          expect(res.body[0].components).to.have.length(2);
          expect(res.body[1].name).to.equal('TestApplication2');
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

  describe('When an application is added', function () {

    it('should turn docker-compose.yml into components', function (done) {
      agent
        .post('/registerComponents')
        .send({app: 2, gitUrl: 'https://github.com/Clabfabs/docker-network-demos.git'})
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          expect(res.body).to.have.length(2);
          expect(res.body[0].image).to.equal('bfirsh/compose-mongodb-demo');
          expect(res.body[1].image).to.equal('mongo');
          done();
        })
    });
  });

  describe('When an application is ready to deploy', function () {

    it('should deploy the application', function (done) {
      console.warn('Your swarm will flooded with 2 containers and a new network in any case - don\'t forget to clean it!');
      agent
        .post('/deploy')
        .send({app_id: 1})
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        })
    });
  });
});
