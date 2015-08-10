var app = angular.module('WorldViewerApp', []);
var socket = io();

app.controller('MainCtrl', function ($scope) {

  $scope.controlsOpen = false;
  $scope.point = {};

  function onPointSelected(point) {
    $scope.point = point;
    $scope.$apply();
  }

  var world = new World('Andy\'s World', {
    numPoints: 1000,
    numReservePoints: 100000,
    size: 10000,
    pointSize: 5,
    showStats: false,
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
    // world.testAddPoints();

    // get some test points to add
    socket.emit('world:test:add-points', { n: 100, size: world.options.size });
  };

  socket.on('world:points:add', function(data) {
    world.addPoint(data.x, data.y, data.z, data.payload);
  });

  socket.emit('world:created', { ua: navigator.userAgent });



});
