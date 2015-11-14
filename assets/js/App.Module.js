angular.module('AppModule', ['toastr', 'compareTo'])
  .run(function ($http, $rootScope) {
    $http.get('/confirm-login')
      .success(function (body) {
        $rootScope.user = body.id;
      })
      .error(function(response) {
        $rootScope.user = undefined;
      })
  });
