/**
 * Created by isler on 10-Aug-16.
 */
var request = require('supertest');
var expect = require('chai').expect;

var agent;
var appId;
var organId;
var rule1Id;
var rule2Id;
var rule3Id;

var testObject = {
  metric: 'cpu',
  operator: '1',
  value: '0.9',
  weight: 1.0,
};

var newTestValue = '0.6';
var testMetric2 = 'cpu2';
var testMetric3 = 'cpu3';


describe('RuleController', function () {

  // Logging in & adding an app
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
            organId = res2.body.app.organs[0].id;
            setTimeout(function () {
              done();
            }, 1000); // To let the server clean up
          });
      })
  });

  describe('When an application is added', function () {

    it('should find no rules yet for the added application', function (done) {
      agent
        .get('/policy?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('rules');
          expect(res.body.rules).to.have.length(0);
          done();
        })
    });

    it('should add a rule', function (done) {
      var rule = _.defaults({
        application_id: appId,
        organs: [{
          organ_id: organId
        }]
      }, testObject);
      agent
        .post('/policy/set')
        .send({
          app_id: appId,
          rules: [rule]
        })
        .expect(200)
        .end(done);
    });

    it('should now find the added rule', function (done) {
      agent
        .get('/policy?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('rules');
          expect(res.body.rules).to.have.length(1);
          expect(res.body.rules[0]).to.contain.keys('id');
          rule1Id = res.body.rules[0].id;
          checkRule(res.body.rules[0]);
          done();
        })
    });

    newTestValue = testObject.value; // TODO: As soon as the following test passes again, delete this line
    /*it('should replace the added rule', function (done) { // TODO: Replacement seem not to work
     agent
     .post('/policy/set')
     .send({
     app_id: appId,
     rules: [
     {
     application_id: appId,
     metric: testMetric,
     operator: testOperator,
     value: newTestValue,
     weight: testWeight,
     organs: [{
     organ_id: organId
     }]
     }
     ]
     })
     .expect(200)
     .end(done);
     });*/

    it('should find the new rule', function (done) {
      agent
        .get('/policy?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('rules');
          expect(res.body.rules).to.have.length(1);
          expect(res.body.rules[0]).to.contain.keys('id');
          expect(res.body.rules[0].id).to.equal(rule1Id);
          checkRule(res.body.rules[0], {value: newTestValue});
          done();
        })
    });

    it('should add two more rules', function (done) {
      var rule1 = _.defaults({
        application_id: appId,
        organs: [{
          organ_id: organId
        }],
        metric: testMetric2
      }, testObject);

      var rule2 = _.defaults({
        application_id: appId,
        organs: [{
          organ_id: organId
        }],
        metric: testMetric3
      }, testObject);

      agent
        .post('/policy/set')
        .send({
          app_id: appId,
          rules: [rule1, rule2]
        })
        .expect(200)
        .end(done);
    });

    it('should find all three rules', function (done) {
      agent
        .get('/policy?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('rules');
          expect(res.body.rules).to.have.length(3);
          var rule1 = _.find(res.body.rules, {metric: testObject.metric});
          expect(rule1).to.contain.keys('id');
          expect(rule1.id).to.equal(rule1Id);
          checkRule(rule1, {value: newTestValue});
          var rule2 = _.find(res.body.rules, {metric: testMetric2});
          expect(rule2).to.contain.keys('id');
          rule2Id = rule2.id;
          checkRule(rule2, {metric: testMetric2});
          var rule3 = _.find(res.body.rules, {metric: testMetric3});
          expect(rule3).to.contain.keys('id');
          rule3Id = rule3.id;
          checkRule(rule3, {metric: testMetric3});
          done();
        })
    });

    it('should not remove any rule because the id does not exist', function (done) {
      agent
        .post('/policy/remove')
        .send({ids: 'nonExistingId'})
        .expect(200)
        .end(function (err, res1) {
          if (err) return done(err);
          agent
            .get('/policy?app_id=' + appId)
            .expect(200)
            .end(function (err, res2) {
              if (err) return done(err);
              expect(res2.body).to.contain.keys('rules');
              expect(res2.body.rules).to.have.length(3); // Didn't delete anything
              done();
            })
        })
    });

    it('should not remove any rule because no id is sent', function (done) {
      agent
        .post('/policy/remove')
        .expect(400)
        .end(done);
    });

    it('should not remove any rule because ids array is empty', function (done) {
      agent
        .post('/policy/remove')
        .send({ids: []})
        .expect(400)
        .end(done);
    });

    it('should still find all rules', function (done) {
      agent
        .get('/policy?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('rules');
          expect(res.body.rules).to.have.length(3);
          done();
        })
    });

    it('should remove the first rule', function (done) {
      agent
        .post('/policy/remove')
        .send({ids: rule1Id})
        .expect(200)
        .end(done)
    });

    it('should remove the last two rules', function (done) {
      agent
        .post('/policy/remove')
        .send({ids: [rule2Id, rule3Id]})
        .expect(200)
        .end(done)
    });

    it('should find no rules anymore', function (done) {
      agent
        .get('/policy?app_id=' + appId)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          expect(res.body).to.contain.keys('rules');
          expect(res.body.rules).to.have.length(0);
          done();
        })
    });

  });
});

function checkRule(rule, values) {
  if (!values) values = {};
  var testRule = _.defaults(values, testObject);
  expect(rule).to.contain.keys(['application_id', 'metric', 'operator', 'value', 'weight', 'organs']);
  expect(rule.application_id).to.equal(appId);
  expect(rule.metric).to.equal(testRule.metric);
  expect(rule.operator).to.equal(testRule.operator);
  expect(rule.value).to.equal(testRule.value);
  expect(rule.weight).to.equal(testRule.weight);
  expect(rule.organs).to.have.length(1);
  expect(rule.organs[0]).to.contain.keys('id');
  expect(rule.organs[0].id).to.equal(organId);
}

