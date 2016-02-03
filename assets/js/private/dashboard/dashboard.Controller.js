;
angular.module('AppModule').controller('DashboardController', ['$scope', '$sails', 'toastr', function ($scope, $sails, toastr) {

  $scope.applications = [];

  $scope.components = [];

  $scope.nodes = [
    'swarm-master',
    'swarm-agent-00'
  ];

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
    $sails.post('/app', {
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
    $sails.post('/component', {
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
    $sails.post('/registerComponents', {
        gitUrl: $scope.addGitURLForm.url,
        app: app.id
      })
      .then(function onSuccess(sailsResponse) {
        for (var i = 0; i < sailsResponse.data.length; i++) {
          $scope.components.push(sailsResponse.data[i]);
        }
      })
      .catch(function onError(sailsResponse) {
        toastr.error(sailsResponse.data);
        console.log(sailsResponse);
      })
      .finally(function eitherWay() {
        $scope.addGitURLForm.loading = false;
        $scope.addGitURLForm.url = null;
      })
  };

  $scope.deploy = function (app) {
    $sails.post('/deploy', {app_id: app.id})
      .then(function onSuccess(sailsResponse) {
        _.each(sailsResponse.data, function(entry) {
          var index = _.indexOf($scope.components, _.find($scope.components, {id: entry.id}));
          $scope.components.splice(index, 1, entry);
        });
        toastr.success('Deployed!');
      })
      .catch(function onError(sailsResponse) {
        toastr.error(sailsResponse.data);
      })
      .finally(function eitherWay() {

      })
  };

  $scope.move = function(component, goal_node) {
    $sails.post('/move', {component_id: component.id, goal_node: goal_node})
      .then(function onSuccess(sailsResponse) {
        _.each(sailsResponse.data, function(entry) {
          var index = _.indexOf($scope.components, _.find($scope.components, {id: entry.id}));
          $scope.components.splice(index, 1, entry);
        });
      })
      .catch(function onError(sailsResponse) {
        toastr.error(sailsResponse.data);
      })
      .finally(function eitherWay() {

      })
  };

  var getApps = function () {
    $sails.get('/getUserApps')
      .success(function (data, status, headers, jwr) {
        $scope.applications = data.apps;
        $scope.components = data.components;
      })
      .error(function (data, status, headers, jwr) {
        toastr.error('Couldn\'t load applications', 'Error')
      })
  };

  // TODO: Sockets don't work yet
  $sails.on('component', function(message) {
    console.log(message);
    if (message.verb === 'created') {
      console.log('SOCKET PUSH OF ', message.data);
      $scope.components.push(message.data);
    }
    if (message.verb === 'updated') {
      for (var i = 0; i < $scope.components.length; i++) {
        if ($scope.components[i].id = message.data.id) {
          $scope.components[i] = message.data;
        }
      }
    }
  });

  getApps();
}]);
