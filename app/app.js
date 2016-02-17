'use strict';

// Declare app level module which depends on views, and components
angular.module('picross', [
  'ngRoute',
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/picross'});
}]);







///
/// HELPER FUNCTIONS
///

// Generates random number (using Math.random) in the range [min, max].
function randomInt(min, max)
{
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Generates a list [min, max) of max-min elements.
function rangeArray(min, max)
{
  return Array.apply(null, Array(max-min)).map(function (_,i) {return min+i;});
}

// Create an array of size filled with val
function createArray(size, val)
{
  return Array.apply(null, Array(size)).map(function () {return val;});
}