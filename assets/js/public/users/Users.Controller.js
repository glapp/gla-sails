angular.module('UsersModule').controller('UsersController', ['$scope', '$sails', function($scope, $sails) {

  console.log("debug 1");
  var getUsers = function() {
    $sails.get('/user')
      .success(function(users) {
        $scope.users = users;
      })
      .error(function(response) {
        alert(response);
      })
  };

  $scope.addUser = function() {
    console.log('HERE I AM!!!');
    /*var user = new User({username: $scope.newUser});
     user.$save(function(result) {
     $scope.users.push(result);
     $scope.newUser = null;
     });*/
    $sails.post('/user', {username: $scope.newUser})
      .success(function(result) {
        $scope.users.push(result);
        $scope.newUser = null;
      })
      .error(function(response) {
        alert(response);
      })
  };

  $scope.newUser = null;
  getUsers();

}]);
