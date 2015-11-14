/*var Passwords = require('machinepack-passwords');
function encryptPassword(password) {
  Passwords.encryptPassword({
    password: password,
    difficulty: 10
  }).exec({
    // An unexpected error occurred.
    error: function (err) {
      console.error(err);
      return password;
    },
    // OK.
    success: function (encPassword) {
      return encPassword;
    }
  });
}*/

module.exports = [
  {
    email: 'test@test.com',
    encryptedPassword: 'password'
      /*encryptPassword('password', function(password) {
      return password;
    })*/,
    id: 1
  }
]
