/**
 * Created by Fabio-local on 13.11.2015.
 */
/**
 * Created by isler on 12-Nov-15.
 */
var request = require('supertest');
var expect = require('chai').expect;

var agent;
var appId;
var organId;

describe('AnalyticsController', function () {

  // Logging in & deploying an app
  before(function (done) {
    agent = request.agent(sails.hooks.http.app);
    agent
      .put('/user/login')
      .send({email: 'test@test.com', password: 'password'})
      .end(function (err, res1) {
        if (err) return done(err);
        agent
          .post('/application/add')
          .send({name: 'testapp', gitUrl: 'https://github.com/Clabfabs/docker-network-demos.git'})
          .end(function (err, res2) {
            if (err) return done(err);
            appId = res2.body.app.id;
            setTimeout(function () {
              agent
                .post('/application/deploy')
                .send({app_id: res2.body.app.id})
                .end(done)
            }, 1000);
          });
      })
  });

  describe('When an application is deployed', function () {

    it('should find details of the application, including deployment data', function (done) {
      agent
        .get('/application/details?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys(['organs', 'rules', 'log', 'owner', 'networkId']);
          expect(res.body.organs).to.have.length(2);
          expect(res.body.organs[0]).to.contain.keys(['cells', 'application_id', 'originalName', 'environment', 'image', 'id']);
          expect(res.body.organs[0].cells).to.have.length(2);
          expect(res.body.organs[0].cells[0]).to.contain.keys(['host', 'isProxy', 'container_id', 'organ_id', 'environment']);
          expect(res.body.organs[0].cells[0].host).to.contain.keys(['name', 'ip', 'status']);
          organId = res.body.organs[0].id;
          done();
        })
    });

    it('should retrieve CPU analytics data for the first organ', function (done) {
      agent
        .get('/analytics/organCpu?organ_id=' + organId + '&timespan=10m')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.have.length.of.at.least(2);
          _.forEach(res.body, function(data) {
            expect(data).to.have.keys(['timestamp', 'value']);
            expect(data.value).to.be.at.least(0);
            // expect(data.value).to.be.at.most(1); // FIXME: Values seem to add up
          });
          expect(res.body[0].timestamp).to.be.above(res.body[res.body.length - 1].timestamp); // Make sure it's sorted
          done();
        })
    });

    it('should retrieve memory analytics data for the first organ', function (done) {
      agent
        .get('/analytics/organMemory?organ_id=' + organId + '&timespan=10m')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.have.length.of.at.least(2);
          _.forEach(res.body, function(data) {
            expect(data).to.have.keys(['timestamp', 'value']);
            expect(data.value).to.be.at.least(0);
            // expect(data.value).to.be.at.most(1); // FIXME
          });
          expect(res.body[0].timestamp).to.be.above(res.body[res.body.length - 1].timestamp); // Make sure it's sorted
          done();
        })
    });

    it('should retrieve the events of an application', function (done) {
      agent
        .get('/analytics/events?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.have.length.of.at.least(2);
          _.forEach(res.body, function(data) {
            expect(data).to.contain.keys(['application_id', 'content', 'type', 'name', 'id', 'createdAt']);
            expect(data.application_id).to.equal(appId);
          });
          var first = Date.parse(res.body[0].createdAt);
          var last = Date.parse(res.body[res.body.length - 1].createdAt);
          expect(first).to.be.above(last); // Make sure it's sorted
          done();
        })
    });
  });


  // Clearing docker if tests fail
  after(function (done) {
    // Check if the deployed app is still not removed (-> tests failed)
    agent
      .get('/application/getUserApps')
      .end(function (err, res) {
        if (err) return done(err);
        if (res.body.apps.length < 3) return done();

        // If so, remove it
        agent
          .post('/application/remove')
          .send({app_id: appId})
          .end(function (err, res) {
            console.log('\n ---------> Docker cleared.');
            done(err, res);
          })
      });
  });
});
