var app = angular.module('WorldViewerApp', []);

app.controller('MainCtrl', function ($scope) {

  $scope.controlsOpen = false;
  $scope.point = {};

  function onPointSelected(point) {
    $scope.point = point;
    $scope.$apply();
  }

  var world = new World('Andy\'s World', {
    numPoints: 1000,
    numReservePoints: 1000,
    size: 10000,
    pointSize: 5,
    showStats: true,
    vertexShaderId: 'vertexshader',
    fragmentShaderId: 'fragmentshader',
    containerId: 'WebGLCanvas',
    debug: true,
    onPointSelected: onPointSelected
  });

  $scope.testMovePoints = function() {
    world.testMovePoints(100);
  };
  $scope.testAddPoints = function() {
    world.testAddPoints();
  };



});
