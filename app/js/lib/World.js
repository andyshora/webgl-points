var stop = false;

var World = klass({
  initialize: function(name, opts) {

    console.log('initializing new world', name, opts);
    this.name = name;

    this.defaultOptions = {
      'name': { type: 'string', defaultValue: 'Test World' },
      'size': { type: 'number', defaultValue: 10000 },
      'numParticles': { type: 'number', defaultValue: 1000 },
      'numReserveParticles': { type: 'number', defaultValue: 1000 },
      'particleSize': { type: 'number', defaultValue: 10000 },
      'showStats': { type: 'boolean', defaultValue: false },
      'vertexShaderId': { type: 'string', defaultValue: 'vertexshader' },
      'fragmentShaderId': { type: 'string', defaultValue: 'fragmentshader' },
      'containerId': { type: 'string', defaultValue: 'WebGLCanvas' }
    };

    this.setOptions(opts);

    // set the scene size
    this.sceneOptions = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // set some camera attributes


    // this.scene = null;
    // this.renderer = null;
    // this.camera = null;
    // this.controls = null;
    // this.raycaster = null;
    this.stats = null;

    // for mouse intersection - interacting with particles
    this.mouse = { x: 0, y: 0 };
    this.intersectedIndex = -1;

    // for adding points without reallocating buffers
    this.reserveParticlesUsed = 0;
    this.newParticlesQueue = [];

    this.updateVertices = false;

    this.cameraOptions = {
      viewAngle: 60,
      near: 1,
      far: this.options.size * 10
    };

    this.pointsToMove = false;


    // Check for WebGL Support
    if (!Detector.webgl) {
      alert('WebGL is not supported in your browser.');
      return;
    }

    // create a WebGL renderer, camera, and a scene
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ clearColor: 0x000000, clearAlpha: 1 });
    this.camera = new THREE.PerspectiveCamera(
      this.cameraOptions.viewAngle,
      this.sceneOptions.width / this.sceneOptions.height,
      this.cameraOptions.near,
      this.cameraOptions.far
    );
    console.log(this.camera);

    // for collision detection with mouse vector
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    if (this.options.showStats) {
      this.stats = new Stats();
      this.stats.domElement.style.position = 'absolute';
      this.stats.domElement.style.top = '0';
    }

    this.shaderAttributes = {
      alpha: { type: 'f', value: [] },
      customColor: { type: 'c', value: [] },
      texture1: {
        type: "t",
        value: THREE.ImageUtils.loadTexture('app/textures/sprites/ball.png')
      }
    };

    this.shaderUniforms = {
      color: { type: 'c', value: new THREE.Color( 0xffff00 ) },
      size: { type: 'f', value: this.options.particleSize }
    };

    // particle system material
    // using custom shaders so rendering changes run in parallel on the GPU
    var shaderMaterial = new THREE.ShaderMaterial( {
      uniforms:       this.shaderUniforms,
      attributes:     this.shaderAttributes,
      vertexShader:   document.getElementById(this.options.vertexShaderId).textContent,
      fragmentShader: document.getElementById(this.options.fragmentShaderId).textContent,
      transparent: true,
      vertexColor: true
    });

    // the camera starts at 0,0,0 so pull it back
    this.camera.position.z = this.options.size * 2;

    this.controls = new THREE.OrbitControls(this.camera);
    this.controls.zoomSpeed = 0.5;
    this.controls.maxDistance = this.options.size * 5;
    this.controls.addEventListener('change', this.render.bind(this));

    // start the renderer - set a colour with full opacity
    // this.renderer.setClearColor(new THREE.Color(0, 1));
    this.renderer.setSize(this.sceneOptions.width, this.sceneOptions.height);

    this.pointCloudGeometry = new THREE.Geometry();
    this.pointCloudGeometry.dynamic = true;

    // console.log('creating', this.options.numParticles, 'particles');

    // now create the individual particles
    for (var i = 0; i < this.options.numParticles; i++) {

      // create a particle with random position values, -250 -> 250
      var pX = Math.random() * this.options.size - (this.options.size / 2),
          pY = Math.random() * this.options.size - (this.options.size / 2),
          pZ = Math.random() * this.options.size - (this.options.size / 2);

      var particle = new THREE.Vector3(pX, pY, pZ);
      particle.name = 'particle-' + i;
      particle.payload = { data: 123, distanceToMove: this.options.size / 2 };

      // add it to the particle system
      this.pointCloudGeometry.vertices.push(particle);
      this.shaderAttributes.alpha.value[i] = 1;

      this.shaderAttributes.customColor.value[i] = (i % 2 === 1)
        ? new THREE.Color( 0x00ffff )
        : new THREE.Color( 0xff69b4 );
    }

    // create reserve particles which will become visible
    // when we need some added dynamically
    for (var i = this.options.numParticles; i < this.options.numParticles + this.options.numReserveParticles; i++) {

      var pX = 0,
          pY = 0,
          pZ = 0;

      var particle = new THREE.Vector3(pX, pY, pZ);
      particle.name = 'particle-' + i;
      particle.payload = { data: 0, distanceToMove: 0 };

      // add it to the particle system
      this.pointCloudGeometry.vertices.push(particle);
      this.shaderAttributes.alpha.value[i] = 0;

      this.shaderAttributes.customColor.value[i] = new THREE.Color( 0xffff00 );
    }

    this.shaderAttributes.customColor.needsUpdate = true;
    this.shaderAttributes.alpha.needsUpdate = true;
    this.updateVertices = true;

    // create the particle system
    this.pointCloud = new THREE.PointCloud(this.pointCloudGeometry, shaderMaterial);
    this.pointCloud.sortParticles = true;
    this.pointCloud.dynamic = true;

    this.scene.add(this.camera);
    this.scene.add(this.pointCloud);

    document.getElementById(this.options.containerId).appendChild(this.renderer.domElement);
    if (this.options.showStats) {
      console.log(this.stats.domElement);
      document.body.appendChild(this.stats.domElement);
    }
    // window.addEventListener( 'mousemove', onDocumentMouseMove, false );
    // window.addEventListener( 'mousedown', onDocumentMouseDown, false );

    console.log('Starting animation...');

    this.animate();
  },
  setOptions: function(opts) {
    this.options = this.options || {};

    for (var key in this.defaultOptions) {

      // check if key present in instance options
      if (key in opts) {

        if (typeof opts[key] === this.defaultOptions[key].type) {
          // valid type
          this.options[key] = opts[key];

        } else {
          // key valid but value incorrect type
          console.error('Invalid option type for', key, 'Type: ' + typeof opts[key], '. Expected: ' + this.defaultOptions[key].type);
        }

      } else {
        // set default option
        this[key] = this.defaultOptions[key].defaultValue;
      }

    }
  },
  animate: function() {
    if (stop) {
      console.error('World animation stopped');
      return;
    } else {
      var requestId = requestAnimationFrame(this.animate.bind(this));
      // requestAnimationFrame(this.animate);
      // console.log('animate', requestId);
    }

    // console.log(this.render);
    this.controls.update();

    if (this.options.showStats) {
      this.stats.update();
    }

    if (this.pointsToMove) {
      this.movePoints();
    }

    this.render();
  },
  render: function () {

    // console.log('render', this.name);

    // check if vertices have chaged since last render
    if (this.updateVertices) {
      this.pointCloudGeometry.verticesNeedUpdate = true;
      this.updateVertices = false;
    }

    // flags to ensure we do work in this frame's budget only
    var startTime = +new Date(),
        timeElapsed = 0,
        particleToAdd = null,
        numParticlesAddedThisFrame = 0;

    // if there are new points to add, do what you can in 10ms
    while ((timeElapsed < 10) && this.newParticlesQueue && (particleToAdd = this.newParticlesQueue.shift())) {

      console.log('adding particle', particleToAdd, timeElapsed);

      var i = this.options.numParticles + this.reserveParticlesUsed;

      if (i >= this.options.numParticles + this.options.numReserveParticles) {
        console.error('No more reserve particles to use. Implement dynamic buffer allocation.');
        break;
      }

      // add it to the particle system
      this.pointCloudGeometry.vertices[i].set(particleToAdd.x, particleToAdd.y, particleToAdd.z);
      this.reserveParticlesUsed++;

      // show as visible
      this.shaderAttributes.alpha.value[i] = 1;

      this.shaderAttributes.customColor.needsUpdate = true;
      this.shaderAttributes.alpha.needsUpdate = true;
      this.updateVertices = true;

      numParticlesAddedThisFrame++;
      timeElapsed += +new Date() - startTime;
      console.log('numParticlesAddedThisFrame', numParticlesAddedThisFrame);
    }

    if (!this.raycaster) {
      stop = true;
      console.log('stopped', this);
    }

    if (this.raycaster) {
      this.raycaster.setFromCamera(this.mouse, this.camera);

    } else {
      console.error('raycaster not defined');
    }

    // console.log('this.renderer.render', this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);

  },
  movePoints: function () {},
  addTestPoints: function () {
    console.log('addTestPoints');
    for (var i = 0; i < 100; i++) {
      this.newParticlesQueue.push({ x: (Math.cos(i) + 1) * 1000, y: (Math.sin(i) + 1) * 1000, z: 0 });
    }
  },
  onWindowResize: function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( window.innerWidth, window.innerHeight );

    this.render();
  }
});

var world = new World('Andy\'s World', {
  numParticles: 1000,
  numReserveParticles: 1000,
  size: 10000,
  particleSize: 2,
  showStats: true,
  vertexShaderId: 'vertexshader',
  fragmentShaderId: 'fragmentshader',
  containerId: 'WebGLCanvas'
});

window.addEventListener('resize', world.onWindowResize.bind(world), false);

