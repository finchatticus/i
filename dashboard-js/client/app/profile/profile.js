(function () {
  'use strict';

  angular
    .module('dashboardJsApp')
    .config(profileConfig);

  profileConfig.$inject = ['$stateProvider'];
  function profileConfig($stateProvider) {
    $stateProvider
      .state('profile', {
        url: '/profile',
        templateUrl: 'app/profile/profile.html',
        controller: 'ProfileCtrl',
        access: {
          requiresLogin: true
        }
      });
  }
})();
