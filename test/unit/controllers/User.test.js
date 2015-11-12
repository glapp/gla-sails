/**
 * Created by isler on 12-Nov-15.
 */
var request = require('supertest');

describe('UserController', function() {
  describe('signup', function () {
    it('should return success', function (done) {
      request(sails.hooks.http.app)
        .post('/signup')
        .send({email: 'test@test.com', password: 'test'})
        .expect(200, done);
    });
  });
});
