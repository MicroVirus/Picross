'use strict';

// Declare app level module which depends on views, and components
angular.module('picross', [
  'ngRoute',
  'picross.picross'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/picross'});
}]);
