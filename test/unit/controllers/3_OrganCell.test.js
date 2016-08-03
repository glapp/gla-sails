/**
 * Created by Fabio on 01.08.2016.
 */

var _ = require('lodash');
var request = require('supertest');
var expect = require('chai').expect;

var agent;
var appId;
var organId;
var newCellId;
var oldCellId;
var tempCellId;

describe('Organ- and CellController', function () {

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

    it('should fail to scale up the first organ because organ_id is wrong', function (done) {
      agent
        .post('/organ/scaleUp')
        .send({organ_id: 'notValid'})
        .expect(404)
        .end(done);
    });

    it('should scale up the first organ with region constraint', function (done) {
      agent
        .post('/organ/scaleUp')
        .send({organ_id: organId, options: {region: 'us'}})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys(['organ_id', 'environment', 'isProxy', 'host', 'container_id', 'id']);
          newCellId = res.body.id;
          expect(res.body.environment).to.have.length(1);
          expect(res.body.environment[0]).to.equal('constraint:region==us');
          expect(res.body.isProxy).to.equal(false);
          done();
        })
    });

    it('should now find 3 cells in scaled organ', function (done) {
      agent
        .get('/application/details?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('organs');
          expect(res.body.organs).to.have.length(2);
          var organ = _.find(res.body.organs, {id: organId});
          expect(organ).to.contain.keys('cells');
          expect(organ.cells).to.have.length(3);
          var newCell = _.find(organ.cells, {id: newCellId});
          expect(newCell).to.contain.keys('host');
          expect(newCell.host).to.contain.keys('labels');
          expect(newCell.host.labels).to.contain.keys('region');
          expect(newCell.host.labels.region).to.equal('us');
          var oldCell = _.find(organ.cells, function (cell) {
            return cell.id != newCellId && cell.isProxy == false;
          });
          expect(oldCell).to.contain.keys(['id', 'isProxy', 'host']);
          expect(oldCell.id).to.not.equal(newCellId);
          expect(oldCell.isProxy).to.equal(false);
          oldCellId = oldCell.id;
          done();
        })
    });

    it('should scale up the first organ without constraints', function (done) {
      agent
        .post('/organ/scaleUp')
        .send({organ_id: organId})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys(['organ_id', 'environment', 'isProxy', 'host', 'container_id', 'id']);
          expect(res.body.environment).to.have.length(0);
          expect(res.body.isProxy).to.equal(false);
          tempCellId = res.body.id;
          done();
        })
    });

    it('should scale down the first organ by killing old & temp cell', function (done) {
      agent
        .post('/organ/scaleDown')
        .send({organ_id: organId, cell_id: oldCellId})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          agent
            .post('/organ/scaleDown')
            .send({organ_id: organId, cell_id: tempCellId})
            .expect(200)
            .end(done);
        })
    });

    it('should now find 2 cells again in scaled organ', function (done) {
      agent
        .get('/application/details?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('organs');
          expect(res.body.organs).to.have.length(2);
          var organ = _.find(res.body.organs, {id: organId});
          expect(organ).to.contain.keys('cells');
          expect(organ.cells).to.have.length(2);
          var cell = _.find(organ.cells, {id: newCellId});
          var proxy = _.find(organ.cells, function (cell) {
            return cell.isProxy == true;
          });
          expect(cell).to.contain.keys(['id', 'isProxy']);
          expect(cell.id).to.equal(newCellId);
          expect(cell.isProxy).to.equal(false);
          expect(proxy).to.contain.keys(['id', 'isProxy']);
          expect(proxy.isProxy).to.equal(true);
          done();
        })
    });

    it('should move new cell from US to EU', function (done) {
      agent
        .post('/cell/move')
        .send({cell_id: newCellId, options: {region: 'eu'}})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys(['organ_id', 'environment', 'isProxy', 'host', 'container_id', 'id']);
          expect(res.body.environment).to.have.length(1);
          expect(res.body.environment[0]).to.equal('constraint:region==eu');
          expect(res.body.isProxy).to.equal(false);
          done();
        })
    });

    it('should find 2 cells again, new cell in region EU', function (done) {
      agent
        .get('/application/details?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('organs');
          expect(res.body.organs).to.have.length(2);
          var organ = _.find(res.body.organs, {id: organId});
          expect(organ).to.contain.keys('cells');
          expect(organ.cells).to.have.length(2);
          var cell = _.find(organ.cells, {id: newCellId});
          var proxy = _.find(organ.cells, function (cell) {
            return cell.isProxy == true;
          });
          expect(cell).to.contain.keys(['id', 'isProxy', 'host']);
          expect(cell.id).to.equal(newCellId);
          expect(cell.isProxy).to.equal(false);
          expect(cell.host).to.contain.keys('labels');
          expect(cell.host.labels).to.contain.keys('region');
          expect(cell.host.labels.region).to.equal('eu');
          expect(proxy).to.contain.keys(['id', 'isProxy']);
          expect(proxy.isProxy).to.equal(true);
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
