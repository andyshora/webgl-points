var app = angular.module('WorldViewerApp', []);

app.controller('MainCtrl', function ($scope) {

  $scope.controlsOpen = false;
  $scope.point = {};
  $scope.autoRotate = false;
  $scope.worldCreated = false;
  $scope.particlesInWorld = 0;

  // world params
  $scope.worldSize = 4000;
  $scope.numPoints = 0;
  $scope.pointSize = 5;
  $scope.targetFrameRate = 60;
  $scope.dataSource = 'http://172.16.2.133:5005/entities/position?southWest=-31,-24&northEast=30,23';

  var streamSampleRate = 1;
  var world = null;
  var vertexIndex = [];

  for (var i = 0; i < 1000000; i++) {
    vertexIndex.push(null);
  }

  $scope.onCreateNewClicked = function() {
    world.destroy();
    world = null;
    $scope.worldCreated = false;
    es.close();
  };

  $scope.createWorld = function() {

    world = new World('Andy\'s World', {
      numPoints: parseInt($scope.numPoints, 10),
      numReservePoints: parseInt($scope.numPoints, 10) < 100000 ? 100000 : parseInt($scope.numPoints, 10),
      size: parseInt($scope.worldSize, 10),
      pointSize: parseInt($scope.pointSize, 10),
      showStats: true,
      vertexShaderId: 'vertexshader',
      fragmentShaderId: 'fragmentshader',
      containerId: 'WebGLCanvas',
      debug: true,
      onPointSelected: onPointSelected,
      onPointAdded: onPointAdded,
      onPointDeleted: onPointDeleted,
      autoRotate: $scope.autoRotate,
      targetFrameRate: parseInt($scope.targetFrameRate, 10)
    });

    $scope.worldCreated = true;
    initEventSource($scope.dataSource);

  };

  $scope.$watch('numPoints', function(numPoints) {
    // lower target frame rate as user changes numPoints
    if (numPoints) {
      if (parseInt(numPoints, 10) > 1000000) {
        $scope.targetFrameRate = 12;
      } else if (parseInt(numPoints, 10) > 500000) {
        $scope.targetFrameRate = 30;
      }
    }
  });

  function onPointSelected(point) {
    $scope.point = point;
    $scope.$apply();
  }

  function onPointDeleted(i) {
    console.log('onPointDeleted', i);
    $scope.particlesInWorld--;
    $scope.$apply();
  }

  function onPointAdded(i, id) {
    // console.log('onPointAdded', i, id);
    // store vertex position of this entity
    vertexIndex[id] = i;
    $scope.particlesInWorld++;
    $scope.$apply();
  }

  $scope.toggleRotation = function() {
    $scope.autoRotate = !$scope.autoRotate;
    world.setAutoRotate($scope.autoRotate);
  };




  function initEventSource(dataSource) {
    console.log('initEventSource');

    var arr = [];
    var i = 0;
    es = new EventSource(dataSource);
    console.log('event source', es);
    es.onmessage = function(e) {
      i++;

      var data = JSON.parse(e.data);

      for (var j = 0; j < data.length; j++) {

        switch (data[j][0]) {
          case 'put':
            var id = data[j][1];
            var coords = data[j][2];
            var index = vertexIndex[parseInt(id, 10)];

            if (index === null) {
              console.error('Invalid update request. Entity ' + id + ' has not been added yet:', vertexIndex[id]);
              break;
            }

            // potentially sample the updates if they are very high frequency
            if (i % streamSampleRate === 0) {
              world.updatePoint(index, coords[0], coords[1], coords[2], { id: id });
            }


            break;
          case 'new':
            var id = data[j][1];
            var coords = data[j][2];
            var prefab = data[j][3];

            // todo - check for dupes
            if (vertexIndex[id] !== null) {
              break;
            }

            world.addPoint(coords[0], coords[1], coords[2], { id: id, prefab: prefab });
          break;
          case 'del':
            var id = data[j][1];
            world.deletePoint(vertexIndex[id]);
            // remove id from vertex index
            vertexIndex[id] = null;
          break;
        }


      }

    };
    es.onopen = function(e) {
      console.log('event source open', e);
    };
    es.onerror = function() {
      console.log('ERROR!');
    };
  }


});


