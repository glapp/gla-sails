angular.module('AppModule').controller('DashboardController', ['$scope', '$http', function ($scope, $http) {

  $scope.applications = [];

  $scope.addAppForm = {
    loading: false
  };

  $scope.addApplication = function () {

    // Set the loading state (i.e. show loading spinner)
    $scope.addAppForm.loading = true;

    // Submit request to Sails.
    $http.post('/app', {
      name: $scope.addAppForm.name
    })
      .then(function onSuccess(sailsResponse) {
        $scope.applications.push(sailsResponse.data);
      })
      .catch(function onError(sailsResponse) {

      })
      .finally(function eitherWay() {
        $scope.addAppForm.loading = false;
      })
  };

  var getApps = function () {
    $http.get('/getUserApps')
      .success(function (data, status, headers, jwr) {
        $scope.applications = data;
      })
      .error(function (data, status, headers, jwr) {
        alert('couldn\'t load applications')
      })
  };

  getApps();
}])
;
