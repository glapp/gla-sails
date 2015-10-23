angular.module('AppModule').controller('NavbarController', ['$scope', '$rootScope', '$http', 'toastr', function($scope, $rootScope, $http, toastr){

  // set-up loginForm loading state
  $scope.loginForm = {
    loading: false
  };

  $scope.submitLoginForm = function (){

    // Set the loading state (i.e. show loading spinner)
    $scope.loginForm.loading = true;

    // Submit request to Sails.
    $http.put('/login', {
      email: $scope.loginForm.email,
      password: $scope.loginForm.password
    })
      .then(function onSuccess (sailsResponse){
        $rootScope.user = sailsResponse.data.id;
        // Refresh the page now that we've been logged in.
        window.location = '/';
      })
      .catch(function onError(sailsResponse) {

        // Handle known error type(s).
        // Invalid username / password combination.
        if (sailsResponse.status === 400 || 404) {
          // $scope.loginForm.topLevelErrorMessage = 'Invalid email/password combination.';
          //
          toastr.error('Invalid email/password combination.', 'Error', {
            closeButton: true
          });
          return;
        }

        toastr.error('An unexpected error occurred, please try again.', 'Error', {
          closeButton: true
        });
        return;

      })
      .finally(function eitherWay(){
        $scope.loginForm.loading = false;
      });
  };

  $scope.logout = function() {
    $http.get('/logout')
      .then(function onSuccess (sailsResponse){
        $rootScope.user = null;
        // Refresh the page now that we've been logged in.
        window.location = '/';
      })
  };

}]);
