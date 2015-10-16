/**
 * Created by isler on 16-Oct-15.
 */
'use strict';

angular.module('gla-pilot')
  .factory('User', function ($resource) {
    var User = $resource('/user/:id', {
        id: '@_id'
      },
      {}
    );

    return User;
  });
