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

var NUM_PARTICLES = 1000;
var PARTICLE_SIZE = 10;

// set the scene size
var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;

// set some camera attributes
var VIEW_ANGLE = 60,
    NEAR = 1,
    FAR = 5000;

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
  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, window.innerWidth / window.innerHeight, NEAR, FAR);

  // for collision detection with mouse vector
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // custom shader
  /*attributes = {
    size: { type: 'f', value: [] },
    ca: { type: 'c', value: [] }
  };

  uniforms = {
    color: { type: "c", value: new THREE.Color( 0xffffff ) },
    texture: { type: "t", value: 0, texture: THREE.ImageUtils.loadTexture('app/textures/sprites/disc.png') }
  };*/

  attributes = {
      alpha: { type: 'f', value: [] },
  };

  uniforms = {
    color: { type: "c", value: new THREE.Color( 0xff0000 ) }
  };

  // particle system material
  var newShaderMaterial = new THREE.ShaderMaterial( {

      uniforms:       uniforms,
      attributes:     attributes,
      vertexShader:   document.getElementById( 'vertexshader' ).textContent,
      fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
      transparent: true

  });

  // the camera starts at 0,0,0 so pull it back
  camera.position.z = 1000;

  controls = new THREE.OrbitControls( camera );
  controls.addEventListener('change', render);


  // start the renderer - set a colour with full opacity
  // renderer.setClearColor(new THREE.Color(0, 1));
  renderer.setSize(WIDTH, HEIGHT);

  pointCloudGeometry = new THREE.Geometry();

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
    var pX = Math.random() * 500 - 250,
        pY = Math.random() * 500 - 250,
        pZ = Math.random() * 500 - 250;

    var particle = new THREE.Vector3(pX, pY, pZ);
    particle.name = 'particle-' + i;
    particle.payload = { data: 123 };

    // add it to the particle system
    pointCloudGeometry.vertices.push(particle);

    // set alpha based on distance to (local) y-axis
    attributes.alpha.value[ i ] = Math.abs( pointCloudGeometry.vertices[ i ].x / 100 );
  }

  /*var shaderMaterial = new THREE.ShaderMaterial( {

    uniforms: uniforms,
    attributes: attributes,
    vertexShader: document.getElementById( 'vertexshader' ).textContent,
    // fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
    depthTest: false
  });*/


  /*var radius = 150;
  var vertices = pointCloudGeometry.vertices;
  var values_size = attributes.size.value;
  var values_color = attributes.ca.value;

  for( var i = 0; i < vertices.length; i++ ) {

    // custom shader colors for particles
    values_size[i] = PARTICLE_SIZE;
    values_color[i] = new THREE.Color( 1, 1, 1 );

    // values_color[i] = new THREE.Color( 0.01 + 0.1 * ( i / NUM_PARTICLES ), 0.99, 0 );


    values_color[ i ].setHSL( 0.01 + 0.1 * ( i / NUM_PARTICLES ), 0.99, ( vertices[ i ].y + radius ) / ( 2 * radius ) );

  }*/




  // create the particle system
  pointCloud = new THREE.PointCloud(pointCloudGeometry, newShaderMaterial);
  pointCloud.sortParticles = true;
  pointCloud.dynamic = true;



  // setAttributeNeedsUpdateFlags();

  scene.add(camera);
  scene.add(pointCloud);

  window.addEventListener( 'resize', onWindowResize, false );
  window.addEventListener( 'mousemove', onDocumentMouseMove, false );

  // window.addEventListener( 'mousedown', onDocumentMouseDown, false );
}

function setAttributeNeedsUpdateFlags() {
  attributes.ca.needsUpdate = true;
  // attributes.locked.needsUpdate = true;
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
  console.log(intersectedIndex);
  // console.log(particle.name, particle.payload);
}

function render() {

  for( var i = 0; i < attributes.alpha.value.length; i++ ) {

      // dynamically change alphas
      attributes.alpha.value[ i ] *= 0.99;

      if ( attributes.alpha.value[ i ] < 0.2 ) {
          attributes.alpha.value[ i ] = Math.abs( pointCloudGeometry.vertices[ i ].x / 100 );
      }

  }

  attributes.alpha.needsUpdate = true; // important!

  raycaster.setFromCamera( mouse, camera );

  renderer.render( scene, camera );
}

// attach the render-supplied DOM element
document.getElementById('WebGLCanvas').appendChild(renderer.domElement);
