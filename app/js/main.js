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

var NUM_PARTICLES = 100;

// set the scene size
var WIDTH = 800,
    HEIGHT = 600;

// set some camera attributes
var VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.1,
    FAR = 1000;

// create a WebGL renderer, camera, and a scene
var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
var camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1000 );

camera.position.z = 500;

// the camera starts at 0,0,0 so pull it back
camera.position.z = 5;

var controls = new THREE.OrbitControls( camera );
controls.addEventListener('change', render);

scene.add(camera);

// start the renderer - set the clear colour
// to a full black
renderer.setClearColor(new THREE.Color(0, 1));
renderer.setSize(WIDTH, HEIGHT);

// create the particle variables
var pointCloudGeometry = new THREE.Geometry();

var pointCloudMaterial = new THREE.PointCloudMaterial({
  color: 0xffffff,
  size: 1
});

// now create the individual particles
for(var p = 0; p < NUM_PARTICLES; p++) {

  // create a particle with random
  // position values, -250 -> 250
  var pX = Math.random() * 500 - 250,
      pY = Math.random() * 500 - 250,
      pZ = Math.random() * 500 - 250;

  // add it to the particle system
  pointCloudGeometry.vertices.push(new THREE.Vector3(pX, pY, pZ));
}

// create the particle system
var pointCloud = new THREE.PointCloud(pointCloudGeometry, pointCloudMaterial);

pointCloud.sortParticles = true;

// flag that we've changed the evrtices
pointCloud.geometry.__dirtyVertices = true;

console.log(pointCloud);

// add it to the scene
scene.add(pointCloud);





var squareGeometry = new THREE.Geometry();
squareGeometry.vertices.push(new THREE.Vector3(-1.0,  1.0, 0.0));
squareGeometry.vertices.push(new THREE.Vector3( 1.0,  1.0, 0.0));
squareGeometry.vertices.push(new THREE.Vector3( 1.0, -1.0, 0.0));
squareGeometry.vertices.push(new THREE.Vector3(-1.0, -1.0, 0.0));
squareGeometry.faces.push(new THREE.Face3(0, 1, 2));
squareGeometry.faces.push(new THREE.Face3(0, 2, 3));

var squareMaterial = new THREE.MeshBasicMaterial({
  color:0xFFFF00,
  side:THREE.DoubleSide
});

var squareMesh = new THREE.Mesh(squareGeometry, squareMaterial);
squareMesh.position.set(0.5, 0.0, 4.0);
scene.add(squareMesh);

window.addEventListener( 'resize', onWindowResize, false );

animate();

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
