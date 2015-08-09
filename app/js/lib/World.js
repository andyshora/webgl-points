var stop = false;

var World = klass({
  initialize: function(name, opts) {

    console.log('initializing new world', name, opts);
    this.name = name;

    this.defaultOptions = {
      'name': { type: 'string', defaultValue: 'Test World' },
      'size': { type: 'number', defaultValue: 10000 },
      'numPoints': { type: 'number', defaultValue: 1000 },
      'numReservePoints': { type: 'number', defaultValue: 1000 },
      'pointSize': { type: 'number', defaultValue: 10000 },
      'showStats': { type: 'boolean', defaultValue: false },
      'debug': { type: 'boolean', defaultValue: false },
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

    // GPU stats
    this.stats = null;

    // for mouse intersection - interacting with points
    this.mouse = { x: 0, y: 0 };
    this.intersectedIndex = -1;

    // for adding points without reallocating buffers
    this.reservePointsUsed = 0;
    this.addPointsQueue = [];
    this.updatePointsQueue = [];

    this.updateVertices = false;
    this.pointsToMove = false;

    this.cameraOptions = {
      viewAngle: 60,
      near: 1,
      far: this.options.size * 10
    };

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
      size: { type: 'f', value: this.options.pointSize }
    };

    // point system material
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

    // console.log('creating', this.options.numPoints, 'points');

    // now create the individual points
    for (var i = 0; i < this.options.numPoints; i++) {

      // create a point with random position values, -250 -> 250
      var pX = Math.random() * this.options.size - (this.options.size / 2),
          pY = Math.random() * this.options.size - (this.options.size / 2),
          pZ = Math.random() * this.options.size - (this.options.size / 2);

      var point = new THREE.Vector3(pX, pY, pZ);
      point.name = 'point-' + i;
      point.payload = { data: 123, distanceToMove: this.options.size / 2 };

      // add it to the point system
      this.pointCloudGeometry.vertices.push(point);
      this.shaderAttributes.alpha.value[i] = 1;

      this.shaderAttributes.customColor.value[i] = (i % 2 === 1)
        ? new THREE.Color( 0x00ffff )
        : new THREE.Color( 0xff69b4 );
    }

    // create reserve points which will become visible
    // when we need some added dynamically
    for (var i = this.options.numPoints; i < this.options.numPoints + this.options.numReservePoints; i++) {

      var pX = 0,
          pY = 0,
          pZ = 0;

      var point = new THREE.Vector3(pX, pY, pZ);
      point.name = 'point-' + i;
      point.payload = { data: 0, distanceToMove: 0 };

      // add it to the point system
      this.pointCloudGeometry.vertices.push(point);
      this.shaderAttributes.alpha.value[i] = 0;

      this.shaderAttributes.customColor.value[i] = new THREE.Color( 0xffff00 );
    }

    this.shaderAttributes.customColor.needsUpdate = true;
    this.shaderAttributes.alpha.needsUpdate = true;
    this.updateVertices = true;

    // create the point system
    this.pointCloud = new THREE.PointCloud(this.pointCloudGeometry, shaderMaterial);
    this.pointCloud.sortPoints = true;
    this.pointCloud.dynamic = true;

    this.scene.add(this.camera);
    this.scene.add(this.pointCloud);

    document.getElementById(this.options.containerId).appendChild(this.renderer.domElement);

    if (this.options.showStats) {
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
        pointToAdd = null,
        numPointsUpdatedThisFrame = 0;
        numPointsAddedThisFrame = 0;

    // if there are points to update, do what you can in 10ms
    // prioritise updating points over adding points

    while ((timeElapsed < 10) && this.updatePointsQueue && (pointToUpdate = this.updatePointsQueue.shift())) {

      this.pointCloudGeometry.vertices[pointToUpdate.i].set(pointToUpdate.x, pointToUpdate.y, pointToUpdate.z);
      this.pointCloudGeometry.vertices[pointToUpdate.i].payload = pointToUpdate.payload;

      numPointsUpdatedThisFrame++;
      timeElapsed += +new Date() - startTime;
    }

    if (numPointsUpdatedThisFrame) {
      console.log('numPointsUpdatedThisFrame', numPointsUpdatedThisFrame);
    }
    this.updateVertices = true;

    // if there are new points to add, do what you can in 10ms
    while ((timeElapsed < 10) && this.addPointsQueue && (pointToAdd = this.addPointsQueue.shift())) {

      var i = this.options.numPoints + this.reservePointsUsed;

      if (i >= this.options.numPoints + this.options.numReservePoints) {
        console.error('No more reserve points to use. Implement dynamic buffer allocation.');
        break;
      }

      // add it to the point system
      this.pointCloudGeometry.vertices[i].set(pointToAdd.x, pointToAdd.y, pointToAdd.z);
      this.pointCloudGeometry.vertices[i].payload = pointToAdd.payload;
      this.reservePointsUsed++;

      // show as visible
      this.shaderAttributes.alpha.value[i] = 1;


      numPointsAddedThisFrame++;
      timeElapsed += +new Date() - startTime;
    }
    if (numPointsUpdatedThisFrame) {
      console.log('numPointsUpdatedThisFrame', numPointsUpdatedThisFrame);
    }

    if (numPointsAddedThisFrame || numPointsUpdatedThisFrame) {
      this.shaderAttributes.customColor.needsUpdate = true;
      this.shaderAttributes.alpha.needsUpdate = true;
      this.updateVertices = true;
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
  addTestPoints: function () {
    console.log('addTestPoints');

    var payload = { data: 123, distanceToMove: 500 };

    for (var i = 0; i < 100; i++) {
      this.addPoint((Math.cos(i) + 1) * 1000, (Math.sin(i) + 1) * 1000, 0, payload);
    }
  },
  addPoint: function(x, y, z, payload) {
    this.addPointsQueue.push({ x: x, y: y, z: z, payload: payload });
  },
  movePoint: function (i, x, y, z, payload) {
    this.updatePointsQueue.push({ i: i, x: x, y: y, z: z, payload: payload })
    // this.pointCloudGeometry.vertices[i].set(x, y, z);
    // this.updateVertices = true;
  },
  testMovePoints: function(n) {
    for (var i = 0; i < n; i++) {
      var pX = Math.random() * this.options.size / 10 - (this.options.size / 10 / 2),
          pY = Math.random() * this.options.size / 10 - (this.options.size / 10 / 2),
          pZ = Math.random() * this.options.size / 10 - (this.options.size / 10 / 2);

      this.movePoint(i, pX, pY, pZ, {});
    }
  },
  onWindowResize: function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.render();
  }
});

var world = new World('Andy\'s World', {
  numPoints: 1000,
  numReservePoints: 1000,
  size: 10000,
  pointSize: 2,
  showStats: true,
  vertexShaderId: 'vertexshader',
  fragmentShaderId: 'fragmentshader',
  containerId: 'WebGLCanvas',
  debug: true
});

window.addEventListener('resize', world.onWindowResize.bind(world), false);

