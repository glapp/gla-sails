angular.module('AppModule').controller('DashboardController', ['$scope', '$http', 'toastr', function ($scope, $http, toastr) {

  $scope.applications = [];

  $scope.components = [];

  $scope.addAppForm = {
    loading: false
  };

  $scope.addComponentForm = {
    loading: false
  };

  $scope.addGitURLForm = {
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
        sailsResponse.data.components = [];
        $scope.applications.push(sailsResponse.data);
      })
      .catch(function onError(sailsResponse) {
        console.log(sailsResponse);
      })
      .finally(function eitherWay() {
        $scope.addAppForm.loading = false;
        $scope.addAppForm.name = null;
      })
  };

  $scope.addComponent = function (app) {
    // Set the loading state (i.e. show loading spinner)
    $scope.addComponentForm.loading = true;

    // Submit request to Sails.
    $http.post('/component', {
        gitUrl: $scope.addComponentForm.url,
        app: app.id
      })
      .then(function onSuccess(sailsResponse) {
        $scope.components.push(sailsResponse.data);
      })
      .catch(function onError(sailsResponse) {
        console.log(sailsResponse);
      })
      .finally(function eitherWay() {
        $scope.addComponentForm.loading = false;
        $scope.addComponentForm.url = null;
      })
  };

  $scope.registerComponents = function (app) {
    // Set the loading state (i.e. show loading spinner)
    $scope.addGitURLForm.loading = true;

    // Submit request to Sails.
    $http.post('/registerComponents', {
        gitUrl: $scope.addGitURLForm.url,
        app: app.id
      })
      .then(function onSuccess(sailsResponse) {
        for (var i = 0; i < sailsResponse.data.length; i++) {
          app.components.push(sailsResponse.data[i]);
        }
      })
      .catch(function onError(sailsResponse) {
        console.log(sailsResponse);
      })
      .finally(function eitherWay() {
        $scope.addGitURLForm.loading = false;
        $scope.addGitURLForm.url = null;
      })
  };



  $scope.deploy = function (app) {
    $http.post('/deploy', {app_id: app.id})
      .then(function onSuccess(sailsResponse) {
        toastr.success('Deployed!');
      })
      .catch(function onError(sailsResponse) {
        toastr.error('Error while deploying:', sailsResponse);
      })
      .finally(function eitherWay() {

      })
  };

  var getApps = function () {
    $http.get('/getUserApps')
      .success(function (data, status, headers, jwr) {
        $scope.applications = data;
      })
      .error(function (data, status, headers, jwr) {
        toastr.error('Couldn\'t load applications', 'Error')
      })
  };

  getApps();

  io.socket.on('componentReady', function(component) {
    for (var i = 0; i < $scope.components.length; i++) {
      if ($scope.components[i].id = component.id) {
        $scope.components[i] = component;
      }
    }
  })
}])
;
