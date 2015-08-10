var app = angular.module('WorldViewerApp', []);
var socket = io();

app.controller('MainCtrl', function ($scope) {

  $scope.controlsOpen = false;
  $scope.point = {};
  $scope.autoRotate = false;
  $scope.worldCreated = false;

  // world params
  $scope.worldSize = 1000000;
  $scope.numPoints = 10000;
  $scope.pointSize = 4;

  var world = null;

  $scope.createWorld = function() {
    world = new World('Andy\'s World', {
      numPoints: parseInt($scope.numPoints, 10),
      numReservePoints: parseInt($scope.numPoints, 10) < 10000 ? 10000 : parseInt($scope.numPoints, 10),
      size: parseInt($scope.worldSize, 10),
      pointSize: parseInt($scope.pointSize, 10),
      showStats: true,
      vertexShaderId: 'vertexshader',
      fragmentShaderId: 'fragmentshader',
      containerId: 'WebGLCanvas',
      debug: true,
      onPointSelected: onPointSelected,
      autoRotate: $scope.autoRotate
    });

    $scope.worldCreated = true;
  };

  function onPointSelected(point) {
    $scope.point = point;
    $scope.$apply();
  }

  $scope.toggleRotation = function() {
    $scope.autoRotate = !$scope.autoRotate;
    world.setAutoRotate($scope.autoRotate);
  };

  $scope.testMovePoints = function() {
    world.testMovePoints(100);
  };
  $scope.testAddPoints = function() {
    // draw circle
    // world.testAddPoints();

    // get some test points to add
    socket.emit('world:test:add-points', { n: 100, size: world.options.size });
  };

  socket.on('world:points:add', function(data) {
    world.addPoint(data.x, data.y, data.z, data.payload);
  });

  socket.on('world:points:update', function(data) {
    world.updatePoint(data.i, data.x, data.y, data.z, data.payload, data.color, data.size);
  });

  socket.emit('world:created', { ua: navigator.userAgent });

});
