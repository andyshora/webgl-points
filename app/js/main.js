// Check for WebGL Support
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

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

var NUM_PARTICLES = 10;
var PARTICLE_SIZE = 1;

// set the scene size
var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;

var WORLD_SIZE = 100;

// set some camera attributes
var VIEW_ANGLE = 60,
    NEAR = 1,
    FAR = WORLD_SIZE * 10;


var scene, renderer, camera, controls, raycaster;

var pointCloud, pointCloudGeometry;

// for mouse intersection - interacting with particles
var mouse = { x: 0, y: 0 };
var intersectedIndex = -1;

// for custom shaders
var attributes, uniforms;

initWorld();
animate();

function initWorld() {

  // create a WebGL renderer, camera, and a scene
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ clearColor: 0x000000, clearAlpha: 1 });
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, WIDTH / HEIGHT, NEAR, FAR);

  // for collision detection with mouse vector
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  attributes = {
    alpha: { type: 'f', value: [] },
    customColor: { type: 'c', value: [] },
    texture1: { type: "t", value: THREE.ImageUtils.loadTexture('app/textures/sprites/ball.png') }
  };

  uniforms = {
    color: { type: 'c', value: new THREE.Color( 0xff00ff ) },
    size: { type: 'f', value: 2 }
  };

  // particle system material
  var newShaderMaterial = new THREE.ShaderMaterial( {
    uniforms:       uniforms,
    attributes:     attributes,
    vertexShader:   document.getElementById( 'vertexshader' ).textContent,
    fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
    transparent: true,
    vertexColor: true
  });

  // the camera starts at 0,0,0 so pull it back
  camera.position.z = WORLD_SIZE * 2;

  controls = new THREE.OrbitControls( camera );
  controls.zoomSpeed = 0.5;
  controls.maxDistance = WORLD_SIZE * 5;
  controls.addEventListener('change', render);


  // start the renderer - set a colour with full opacity
  // renderer.setClearColor(new THREE.Color(0, 1));
  renderer.setSize(WIDTH, HEIGHT);

  pointCloudGeometry = new THREE.Geometry();
  pointCloudGeometry.dynamic = true;

  /*var pointCloudMaterial = new THREE.PointCloudMaterial({
    color: 0xffffff,
    size: PARTICLE_SIZE,
    fog: true
  });

  var pointCloudMaterial2 = new THREE.PointCloudMaterial({
    color: 0xFFFFFF,
    size: 20,
    map: THREE.ImageUtils.loadTexture(
      'app/textures/sprites/ball.png'
    ),
    blending: THREE.AdditiveBlending,
    transparent: true
  });*/


  // now create the individual particles
  for(var i = 0; i < NUM_PARTICLES; i++) {

    // create a particle with random position values, -250 -> 250
    var pX = Math.random() * WORLD_SIZE - (WORLD_SIZE / 2),
        pY = Math.random() * WORLD_SIZE - (WORLD_SIZE / 2),
        pZ = Math.random() * WORLD_SIZE - (WORLD_SIZE / 2);

    var particle = new THREE.Vector3(pX, pY, pZ);
    particle.name = 'particle-' + i;
    particle.payload = { data: 123 };

    // add it to the particle system
    pointCloudGeometry.vertices.push(particle);

    // set alpha based on distance to (local) y-axis
    // attributes.alpha.value[ i ] = .2 + Math.abs( (pointCloudGeometry.vertices[ i ].x + 250) / 2000 );
    attributes.alpha.value[ i ] = 1;

    attributes.customColor.value[i] = new THREE.Color( 0x00ffff );

    attributes.customColor.value[ i ] = new THREE.Color( 0xffffff );
    // attributes.customColor.value[ i ].setRGB(Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255));

  }
  attributes.customColor.needsUpdate = true;


  // create the particle system
  pointCloud = new THREE.PointCloud(pointCloudGeometry, newShaderMaterial);
  pointCloud.sortParticles = true;
  pointCloud.dynamic = true;


  scene.add(camera);
  scene.add(pointCloud);

  window.addEventListener( 'resize', onWindowResize, false );
  // window.addEventListener( 'mousemove', onDocumentMouseMove, false );

  // window.addEventListener( 'mousedown', onDocumentMouseDown, false );
}

function setAttributeNeedsUpdateFlags() {
  attributes.ca.needsUpdate = true;
  attributes.size.needsUpdate = true;
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

  render();

}

function onDocumentMouseMove( event ) {

  event.preventDefault();

  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  raycaster.setFromCamera( mouse, camera );
  var intersects = raycaster.intersectObjects([ pointCloud ], true );
  if (intersects.length) {
    highlightParticle(intersects[0]);
  }

}

function highlightParticle(p) {
  var particle = pointCloudGeometry.vertices[p.index];
  intersectedIndex = p.index;
  // console.log(intersectedIndex);
  // console.log(particle.name, particle.payload);
}

function render() {

  if (updateVertices) {
    console.log('updateVertices');
    pointCloudGeometry.verticesNeedUpdate = true;
    updateVertices = false;
  }

  raycaster.setFromCamera( mouse, camera );

  renderer.render( scene, camera );
}

function addPoints() {
  console.log('addPoints');

  var n = 1000;

  pointCloudGeometry.verticesNeedUpdate = true;
  for(var i = NUM_PARTICLES; i < NUM_PARTICLES + n; i++) {

    // create a particle with random position values, -250 -> 250
    var pX = Math.random() * WORLD_SIZE - (WORLD_SIZE / 2),
        pY = Math.random() * WORLD_SIZE - (WORLD_SIZE / 2),
        pZ = Math.random() * WORLD_SIZE - (WORLD_SIZE / 2);

    var particle = new THREE.Vector3(pX, pY, pZ);
    particle.name = 'particle-' + i;
    particle.payload = { data: 456 };

    // add it to the particle system
    pointCloudGeometry.vertices.push(particle);

    // set alpha based on distance to (local) y-axis
    // attributes.alpha.value[ i ] = .2 + Math.abs( (pointCloudGeometry.vertices[ i ].x + 250) / 2000 );
    attributes.alpha.value[ i ] = 1;

    attributes.customColor.value[i] = new THREE.Color( 0x00ffff );

    attributes.customColor.value[ i ] = new THREE.Color( 0xffffff );
    // attributes.customColor.value[ i ].setRGB(Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255));

  }
  attributes.customColor.needsUpdate = true;
  attributes.alpha.needsUpdate = true;

  console.log(pointCloud.geometry.vertices.length);

  updateVertices = true;
}
var updateVertices = false;

// attach the render-supplied DOM element
document.getElementById('WebGLCanvas').appendChild(renderer.domElement);
