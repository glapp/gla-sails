angular.module('AppModule', ['toastr', 'compareTo', 'ngSails'])
  .run(function ($sails, $rootScope) {
    $sails.get('/confirm-login')
      .success(function (body) {
        $rootScope.user = body.id;
      })
      .error(function(response) {
        $rootScope.user = undefined;
      })
  });
