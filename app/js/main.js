// Check for WebGL Support

// RAF shim
// @see http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = (function(){
  return window.requestAnimationFrame  ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function(/* function */ callback, /* DOMElement */ element){
      window.setTimeout(callback, 1000 / 60);
    };
  })();

var NUM_PARTICLES = 10000;

// set the scene size
var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;

// set some camera attributes
var VIEW_ANGLE = 60,
    NEAR = 1,
    FAR = 1000;

var scene, renderer, camera, controls;

initWorld();
animate();
render();

function initWorld() {

  // create a WebGL renderer, camera, and a scene
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, window.innerWidth / window.innerHeight, NEAR, FAR);

  // the camera starts at 0,0,0 so pull it back
  camera.position.z = 1000;

  controls = new THREE.OrbitControls( camera );
  controls.addEventListener('change', render);


  // start the renderer - set a colour with full opacity
  renderer.setClearColor(new THREE.Color(0, 1));
  renderer.setSize(WIDTH, HEIGHT);

  // create the particle variables
  var pointCloudGeometry = new THREE.Geometry();
  var pointCloudMaterial = new THREE.PointCloudMaterial({
    color: 0xffffff,
    size: 10,
    fog: true
  });

  // now create the individual particles
  for(var p = 0; p < NUM_PARTICLES; p++) {

    // create a particle with random position values, -250 -> 250
    var pX = Math.random() * 500 - 250,
        pY = Math.random() * 500 - 250,
        pZ = Math.random() * 500 - 250;

    // add it to the particle system
    pointCloudGeometry.vertices.push(new THREE.Vector3(pX, pY, pZ));
  }

  // create the particle system
  var pointCloud = new THREE.PointCloud(pointCloudGeometry, pointCloudMaterial);

  scene.add(pointCloud);
  scene.add(camera);

  window.addEventListener( 'resize', onWindowResize, false );
}


function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

  render();

}

function animate() {

  requestAnimationFrame( animate );
  controls.update();

}

function render() {
  renderer.render( scene, camera );
}

// attach the render-supplied DOM element
document.getElementById('WebGLCanvas').appendChild(renderer.domElement);
