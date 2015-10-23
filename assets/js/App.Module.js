angular.module('AppModule', ['toastr', 'compareTo'])
  .run(function ($http, $rootScope) {
    $http.get('/confirm-login')
      .success(function (user) {
        $rootScope.user = user;
      })
      .error(function(response) {
        $rootScope.user = undefined;
      })
  });
