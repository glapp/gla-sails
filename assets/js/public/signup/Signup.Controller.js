angular.module('AppModule').controller('SignupController', ['$scope', '$rootScope', '$http', 'toastr', function($scope, $rootScope, $http, toastr){

  // set-up loading state
  $scope.signupForm = {
    loading: false
  };

  $scope.submitSignupForm = function(){

    // Set the loading state (i.e. show loading spinner)
    $scope.signupForm.loading = true;

    // Submit request to Sails.
    $http.post('/signup', {
      email: $scope.signupForm.email,
      password: $scope.signupForm.password
    })
      .then(function onSuccess(sailsResponse){
        $rootScope.user = sailsResponse.data.id;
        window.location = '/';
      })
      .catch(function onError(sailsResponse){

        // Handle known error type(s).
        // If using sails-disk adpater -- Handle Duplicate Key
        var emailAddressAlreadyInUse = sailsResponse.status == 400;

        if (emailAddressAlreadyInUse) {
          toastr.error('That email address has already been taken, please try again.', 'Error');
          return;
        }

      })
      .finally(function eitherWay(){
        $scope.signupForm.loading = false;
      })
  }
}]);
