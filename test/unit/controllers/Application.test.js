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

  describe('When a user logs in', function () {

    it('should get pre-filled application', function (done) {
      agent
        .get('/application/getUserApps')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body.apps).to.have.length(2);
          expect(res.body.apps[0].name).to.equal('TestApplication');
          expect(res.body.apps[0].organs).to.have.length(2);
          expect(res.body.apps[1].name).to.equal('TestApplication2');
          done();
        })
    });

    it('should add an application', function (done) {
      agent
        .post('/application/add')
        .send({name: 'testapp', gitUrl: 'https://github.com/Clabfabs/docker-network-demos.git'})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('app');
          expect(res.body.app).to.contain.keys('id');
          expect(res.body.app.id).to.equal(3);
          setTimeout(done, 1000);
        });
    });

    it('should find details of the application that don\'t include deployment data', function (done) {
      agent
        .get('/application/details?app_id=3')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys(['organs', 'rules', 'log', 'owner']);
          expect(res.body).to.not.contain.keys('networkId');
          expect(res.body.organs).to.have.length(2);
          expect(res.body.organs[0]).to.contain.keys(['cells', 'application_id', 'originalName', 'environment', 'image']);
          expect(res.body.organs[0].cells).to.have.length(0);
          done();
        })
    });
  });

  describe('When an application is ready to deploy', function () {

    it('should deploy the application', function (done) {
      agent
        .post('/application/deploy')
        .send({app_id: 3})
        .expect(200)
        .end(done)
    });
  });

  describe('When an application is deployed', function () {

    it('should find details of the application, including deployment data', function (done) {
      agent
        .get('/application/details?app_id=3')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys(['organs', 'rules', 'log', 'owner', 'networkId']);
          expect(res.body.organs).to.have.length(2);
          expect(res.body.organs[0]).to.contain.keys(['cells', 'application_id', 'originalName', 'environment', 'image']);
          expect(res.body.organs[0].cells).to.have.length(2);
          expect(res.body.organs[0].cells[0]).to.contain.keys(['host', 'isProxy', 'container_id', 'organ_id', 'environment']);
          expect(res.body.organs[0].cells[0].host).to.contain.keys(['name', 'ip', 'status']);
          done();
        })
    });

    it('should undeploy the application', function (done) {
      agent
        .post('/application/undeploy')
        .send({app_id: 3})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys(['status', 'networkId']);
          expect(res.body.status).to.equal('ready');
          expect(res.body.networkId).to.equal(null);
          done();
        })
    });

  });

  describe('When an application has been undeployed', function () {

    it('should redeploy the application', function (done) {
      agent
        .post('/application/deploy')
        .send({app_id: 3})
        .expect(200)
        .end(done)
    });
  });

  describe('When an application has been redeployed', function () {

    it('should find details of the application, including deployment data', function (done) {
      agent
        .get('/application/details?app_id=3')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys(['organs', 'rules', 'log', 'owner', 'networkId']);
          expect(res.body.organs).to.have.length(2);
          expect(res.body.organs[0]).to.contain.keys(['cells', 'application_id', 'originalName', 'environment', 'image']);
          expect(res.body.organs[0].cells).to.have.length(2);
          expect(res.body.organs[0].cells[0]).to.contain.keys(['host', 'isProxy', 'container_id', 'organ_id', 'environment']);
          expect(res.body.organs[0].cells[0].host).to.contain.keys(['name', 'ip', 'status']);
          done();
        })
    });

    it('should remove the application', function (done) {
      agent
        .post('/application/remove')
        .send({app_id: 3})
        .expect(200)
        .end(done)
    });
  });

  // Clearing docker if tests fail
  after(function (done) {
    // Check if the deployed app is still not removed (-> tests failed)
    agent
      .get('/application/getUserApps')
      .end(function(err, res) {
        if (err) return done(err);
        if (res.body.apps.length < 3) return done();

        // If so, remove it
        agent
          .post('/application/remove')
          .send({app_id: 3})
          .end(function (err, res) {
            console.log('\n ---------> Docker cleared.')
            done(err, res);
          })
      });
  });
});
