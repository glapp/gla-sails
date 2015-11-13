/**
 * Created by isler on 12-Nov-15.
 */
var session = require('supertest-session');
var assert = require('chai').assert;

var testSession = null;


describe('UserController', function () {

  beforeEach(function () {
    testSession = session(sails.hooks.http.app);
  });

  it('should sign up', function (done) {
    testSession
      .post('/signup')
      .send({email: 'signup@test.com', password: 'test'})
      .expect(200)
      .end(function (err, res) {
        if (err) throw err;
        assert.notTypeOf(res.body.id, 'undefined');
        done();
      });
  });
  /*it('should log in', function (done) {
   testSession
   .post('/login')
   .send({email: 'signup@test.com', password: 'test'})
   .expect(200)
   .end(function (err, res) {
   if (err) throw err;
   assert.notTypeOf(res.body.id, 'undefined');
   done();
   });
   });*/
  it('should confirm being logged in', function (done) {
    testSession
      .get('/confirm-login')
      .expect(200)
      .end(function (err, res) {
        if (err) throw err;
        console.log(res.body);
        assert.notTypeOf(res.body, 'number');
        done();
      })
  })
});
