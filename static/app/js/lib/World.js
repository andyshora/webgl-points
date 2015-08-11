/**
 * 3D WebGL World Viewer
 * Displaying upto 10M points in a 3D space
 * @return {null}
 */
var World = klass({
  /**
   * Initialize the World object, setting up the geometry, camera, and scene.
   * @param  {string} name  The name of the world instance
   * @param  {object} opts  An object containing world creation options.
   * @return {null}
   */
  initialize: function(name, opts) {

    // Check for WebGL Support
    if (!Detector.webgl) {
      alert('WebGL is not supported in your browser.');
      return;
    }

    this.name = name;

    this.defaultOptions = {
      'size': { type: 'number', defaultValue: 10000 },
      'numPoints': { type: 'number', defaultValue: 1000 },
      'numReservePoints': { type: 'number', defaultValue: 1000 },
      'pointSize': { type: 'number', defaultValue: 10000 },
      'showStats': { type: 'boolean', defaultValue: false },
      'debug': { type: 'boolean', defaultValue: false },
      'vertexShaderId': { type: 'string', defaultValue: 'vertexshader' },
      'fragmentShaderId': { type: 'string', defaultValue: 'fragmentshader' },
      'containerId': { type: 'string', defaultValue: 'WebGLCanvas' },
      'onPointSelected': { type: 'function', defaultValue: null },
      'onPointAdded': { type: 'function', defaultValue: null },
      'onPointDeleted': { type: 'function', defaultValue: null },
      'autoRotate': { type: 'boolean', defaultValue: false },
      'targetFrameRate': { type: 'number', defaultValue: 60 },
      'prefabColors': { type: 'object', defaultValue: { 'Tree': new THREE.Color(0x00ee76), 'Cube': new THREE.Color(0xff69b4) } }
    };

    this.setOptions(opts);

    this.n = 0; // animation frame number
    this.animationFrameRequestId = null;
    this.worldStopped = false;

    // achieve target frame rate by skipping frames between rendering
    switch (this.options.targetFrameRate) {
      case 60: this.framesToSkip = 0; break;
      case 30: this.framesToSkip = 1; break;
      case 12: this.framesToSkip = 4; break;
      default: this.framesToSkip = 0;
    }

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
    this.checkForIntersections = false;

    // for adding points without reallocating buffers
    this.reservePointsUsed = 0;
    this.addPointsQueue = [];
    this.updatePointsQueue = [];
    this.deletePointsQueue = [];

    this.updateVertices = false;
    this.pointsToMove = false;

    this.cameraOptions = {
      viewAngle: 60,
      near: 1,
      far: this.options.size * 10
    };

    this.activeIntersection = null;
    this.lastActiveIntersection = null;

    // create a WebGL renderer, camera, and a scene
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ clearColor: 0x000000, clearAlpha: 1 });
    this.renderer.setSize(this.sceneOptions.width, this.sceneOptions.height);

    this.initCamera();

    // for collision detection with mouse vector
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.PointCloud.threshold = this.options.size / 100;

    this.mouse = new THREE.Vector2();

    if (this.options.showStats) {
      this.stats = new Stats();
      this.stats.domElement.style.position = 'absolute';
      this.stats.domElement.style.top = '0';
    }

    this.initControls();
    this.initPointCloud();

    // add objects to scene
    // this.scene.add(this.camera);
    this.scene.add(this.pointCloud);

    if (this.options.containerId) {
      document.getElementById(this.options.containerId).appendChild(this.renderer.domElement);
    } else {
      console.error('No container specified');
      return;
    }

    if (this.options.showStats) {
      document.body.appendChild(this.stats.domElement);
    }

    this.bindEventHandlers();
    this.animate();
  },
  /**
   * Initialise the camera used to view the scene from a point in space.
   * @return {null}
   */
  initCamera: function() {
    this.camera = new THREE.PerspectiveCamera(
      this.cameraOptions.viewAngle,
      this.sceneOptions.width / this.sceneOptions.height,
      this.cameraOptions.near,
      this.cameraOptions.far
    );
    // the camera starts at 0,0,0 so pull it back
    this.camera.position.x = this.options.size * 2;
    this.camera.position.y = this.options.size * 2;
    this.camera.position.z = this.options.size * 2;
  },
  /**
   * Initialise the camera controls for the scene
   * @return {null}
   */
  initControls: function() {
    this.controls = new THREE.OrbitControls(this.camera);
    this.controls.zoomSpeed = 0.5;
    this.controls.maxDistance = this.options.size * 2;
    this.controls.minDistance = this.options.size / 100;
    this.controls.noKeys = true;

    // todo - throttle if frame rate has been lowered
    this.controls.addEventListener('change', this.render.bind(this));
    // this.controls.autoRotate = true;
    // this.controls.autoRotateSpeed = 1.0;
  },
  /**
   * Initialise the Point Cloud, which contains geometry with all points.
   * @return {null}
   */
  initPointCloud: function() {

    this.pointCloudGeometry = new THREE.Geometry();
    this.pointCloudGeometry.dynamic = true;

    // values for the shader which change per point
    this.shaderAttributes = {
      alpha: { type: 'f', value: [] },
      pointSize: { type: 'f', value: [] },
      customColor: { type: 'c', value: [] }
    };

    // values for the shader which stay uniform across points
    this.shaderUniforms = {
      worldSize: { type: 'f', value: this.options.size * 1.0 },
      color: { type: 'c', value: new THREE.Color( 0xffffff ) },
      size: { type: 'f', value: this.options.pointSize },
      pointTexture: {
        type: "t",
        value: THREE.ImageUtils.loadTexture('app/textures/sprites/ball.png')
      }
    };

    var t1 = +new Date();

    // now create the individual points
    for (var i = 0; i < this.options.numPoints; i++) {

      // create a point with random position values
      var pX = Math.random() * this.options.size - (this.options.size / 2),
          pY = Math.random() * this.options.size - (this.options.size / 2),
          pZ = Math.random() * this.options.size - (this.options.size / 2);

      var point = new THREE.Vector3(pX, pY, pZ);
      point.id = 'test-point-' + i;
      point.payload = { data: 123 };

      // add it to the point system
      this.pointCloudGeometry.vertices.push(point);
      this.shaderAttributes.alpha.value[i] = 1;
      this.shaderAttributes.pointSize.value[i] = this.options.pointSize;

      this.shaderAttributes.customColor.value[i] = (i % 2 === 1)
        ? new THREE.Color( 0x00ffff )
        : new THREE.Color( 0xff69b4 );
    }

    var t2 = +new Date();
    console.log(t2 - t1);

    // create reserve points which will become visible
    // when we need some added dynamically
    for (var i = this.options.numPoints; i < this.options.numPoints + this.options.numReservePoints; i++) {

      // doesnt matter where we store these hidden point
      var pX = 0, pY = 0, pZ = 0;
      var point = new THREE.Vector3(pX, pY, pZ);
      point.id = 'test-point-' + i;
      point.payload = { data: 0 };

      // add it to the point system
      this.pointCloudGeometry.vertices.push(point);
      this.shaderAttributes.alpha.value[i] = 0;
      this.shaderAttributes.pointSize.value[i] = this.options.pointSize;
      this.shaderAttributes.customColor.value[i] = new THREE.Color( 0xffff00 );
    }



    this.shaderAttributes.customColor.needsUpdate = true;
    this.shaderAttributes.alpha.needsUpdate = true;
    this.updateVertices = true;

    var axes = this.buildAxes(this.options.size * 0.8);
    this.scene.add(axes);
    console.log(this.scene);

    // point system material
    // using custom shaders so rendering changes run in parallel on the GPU
    var shaderMaterial = new THREE.ShaderMaterial( {
      uniforms:       this.shaderUniforms,
      attributes:     this.shaderAttributes,
      vertexShader:   document.getElementById(this.options.vertexShaderId).textContent,
      fragmentShader: document.getElementById(this.options.fragmentShaderId).textContent,
      transparent:    true,
      vertexColor:    true,
      depthTest:      false /* removes bg overlap */
    });

    // create the point system
    this.pointCloud = new THREE.PointCloud(this.pointCloudGeometry, shaderMaterial);
    this.pointCloud.sortPoints = true;
    this.pointCloud.dynamic = true;
  },
  buildAxes: function(length) {
    var axes = new THREE.Object3D();

    axes.add( this.buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( length, 0, 0 ), 0xFF0000, false ) ); // +X
    axes.add( this.buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( -length, 0, 0 ), 0xFF0000, true) ); // -X


    axes.add( this.buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, length, 0 ), 0x00FF00, false ) ); // +Y
    axes.add( this.buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -length, 0 ), 0x00FF00, true ) ); // -Y

    axes.add( this.buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, length ), 0x0000FF, false ) ); // +Z
    axes.add( this.buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -length ), 0x0000FF, true ) ); // -Z

    return axes;
  },
  /**
   * Draw the x/y/x axis of the world
   * @return {Object<THREE.Line>} The axis to add to the scene
   */
  buildAxis: function (src, dst, colorHex, positiveSide) {
    var axisGeometry = new THREE.Geometry(), axisMaterial;

    if (positiveSide) {

      axisMaterial = new THREE.LineBasicMaterial({ linewidth: 1, fog: true, color: colorHex, transparent: true, opacity: 0.3 });

    } else {
      axisMaterial = new THREE.LineBasicMaterial({ linewidth: 1, fog: true, color: colorHex, transparent: true, opacity: 1 });
    }

    axisGeometry.vertices.push(src.clone());
    axisGeometry.vertices.push(dst.clone());

    var axis = new THREE.Line(axisGeometry, axisMaterial, THREE.LinePieces);

    return axis;
  },
  /**
   * Bind mouse/touch event handlers to interface the controls
   * @return {null}
   */
  bindEventHandlers: function() {
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    window.addEventListener('mousedown', this.onMouseDown.bind(this), false);
    window.addEventListener('mouseup', this.onMouseUp.bind(this), false);

    if ('touchstart' in window) {
      window.addEventListener('touchmove', this.onMouseMove.bind(this), false);
      window.addEventListener('touchdown', this.onMouseDown.bind(this), false);
      window.addEventListener('touchup', this.onMouseUp.bind(this), false);
    } else {
      window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
      window.addEventListener('mousedown', this.onMouseDown.bind(this), false);
      window.addEventListener('mouseup', this.onMouseUp.bind(this), false);
    }
  },
  /**
   * Set world instance options
   * @param {object} opts World options passed into constructor
   */
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
        this.options[key] = this.defaultOptions[key].defaultValue;
      }

    }
  },
  /**
   * Destroy the scene
   * todo - not working
   * @return {null}
   */
  destroy: function() {
    this.worldStopped = true;
    cancelAnimationFrame(this.animationFrameRequestId);
    document.getElementById(this.options.containerId).innerHTML = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.options = null;
    this.raycaster = null;
    this.pointCloudGeometry = null;
    this.pointCloud = null;
  },
  /**
   * Animate one frame of the scene
   * @return {null}
   */
  animate: function() {

    if (this.worldStopped) {
      return;
    }

    if (this.n < this.framesToSkip) {
      this.n++;
      this.animationFrameRequestId = requestAnimationFrame(this.animate.bind(this));
      return;
    }
    this.n = 0;

    this.animationFrameRequestId = requestAnimationFrame(this.animate.bind(this));

    this.controls.update();

    if (this.options.showStats) {
      this.stats.update();
    }

    if (this.pointsToMove) {
      this.movePoints();
    }

    this.render();
  },
  /**
   * Set a flag indicating whether the world should auto rotate
   * @param {boolean} autoRotate Flag for whether the world should spin
   */
  setAutoRotate: function(autoRotate) {
    this.options.autoRotate = autoRotate;
  },
  /**
   * Render the scene. Normally called from this.animate(), once per GPU clock cycle.
   * todo - reduce this code, or throttle some instructions, to ensure this completes
   * in < 10ms so it fits in a frame
   * @return {null}
   */
  render: function () {

    if (this.worldStopped) {
      return;
    }

    if (this.options.autoRotate) {
      var time = Date.now() * 0.0005;
      this.pointCloud.rotation.x = time * 0.25;
      this.pointCloud.rotation.y = time * 0.5;
      this.updateVertices = true;
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

      if (!this.pointCloudGeometry.vertices[pointToUpdate.i]) {
        console.error('Failed to update vertex', pointToUpdate);
        continue;
      }
      if (typeof pointToUpdate.x === 'number') {
        this.pointCloudGeometry.vertices[pointToUpdate.i].set(pointToUpdate.x, pointToUpdate.y, pointToUpdate.z);
      }

      if (typeof pointToUpdate.payload === 'object') {
        this.pointCloudGeometry.vertices[pointToUpdate.i].payload = pointToUpdate.payload;
      }

      // if (typeof pointToUpdate.color === 'object') {
      //   console.log('pointToUpdate.color', pointToUpdate);
      //   this.shaderAttributes.customColor.value[pointToUpdate.i] = pointToUpdate.color;
      // }

      if (typeof pointToUpdate.size === 'number') {
        this.shaderAttributes.pointSize.value[pointToUpdate.i] = pointToUpdate.size;
      }

      numPointsUpdatedThisFrame++;
      timeElapsed += +new Date() - startTime;
    }

    // if there are new points to add, do what you can in 10ms
    while ((timeElapsed < 10) && this.addPointsQueue && (pointToAdd = this.addPointsQueue.shift())) {

      var i = this.options.numPoints + this.reservePointsUsed;

      if (i >= this.options.numPoints + this.options.numReservePoints) {
        console.error('No more reserve points to use. Implement dynamic buffer allocation.');
        break;
      }

      // add it to the point system
      this.pointCloudGeometry.vertices[i].id = pointToAdd.payload.id;
      this.pointCloudGeometry.vertices[i].prefab = pointToAdd.payload.prefab;
      this.pointCloudGeometry.vertices[i].set(pointToAdd.x, pointToAdd.y, pointToAdd.z);
      this.pointCloudGeometry.vertices[i].payload = pointToAdd.payload;

      // color will change depending on point type
      this.shaderAttributes.customColor.value[i] = this.options.prefabColors[this.pointCloudGeometry.vertices[i].prefab];

      this.reservePointsUsed++;

      // show as visible
      this.shaderAttributes.alpha.value[i] = 1;


      numPointsAddedThisFrame++;
      timeElapsed += +new Date() - startTime;

      if (this.options.onPointAdded) {
        this.options.onPointAdded.apply(this, [i, pointToAdd.payload.id]);

      }
    }

    while ((timeElapsed < 10) && this.deletePointsQueue && (pointToDelete = this.deletePointsQueue.shift())) {
      this.shaderAttributes.alpha.value[pointToDelete.i] = 0;
      this.options.onPointDeleted.apply(this, [pointToDelete.i]);
    }



    if (numPointsAddedThisFrame || numPointsUpdatedThisFrame) {

      if (this.options.debug) {
        // console.log('Work done this frame: ', 'points added:', numPointsAddedThisFrame, 'points updated:', numPointsUpdatedThisFrame);
      }

      this.shaderAttributes.customColor.needsUpdate = true;
      this.shaderAttributes.alpha.needsUpdate = true;
      this.shaderAttributes.pointSize.needsUpdate = true;
      this.updateVertices = true;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.checkForIntersections) {

      // reset
      this.checkForIntersections = false;

      var intersections = this.raycaster.intersectObjects([ this.pointCloud ]);

      // select all intersected points
      // for (var i = 0; i < intersections.length; i++) {
      //   this.updatePoint(intersections[i].index, null, null, null, null, null, this.options.pointSize * 5);
      // }

      // sort by closeness to ray
      // select only first intersected point
      var intersection = ( intersections.length ) > 0 ? _.sortBy(intersections, 'distanceToRay')[ 0 ] : null;
      if (intersection) {

        // reset last active intersection
        if (this.lastActiveIntersection) {
          this.updatePoint(this.lastActiveIntersection.index, null, null, null, null, null, this.options.pointSize);
        }

        this.lastActiveIntersection = this.activeIntersection = intersection;

        // update new intersected particle
        this.updatePoint(intersection.index, null, null, null, null, null, this.options.pointSize * 5);
        this.showPointDetails(intersection.index);
      }
    }

    // check if vertices have chaged since last render
    if (this.updateVertices) {
      this.pointCloudGeometry.verticesNeedUpdate = true;
      this.updateVertices = false;
    }

    // todo - consider reducing refresh rate for higher number of points
    this.renderer.render(this.scene, this.camera);

  },
  /**
   * Show details from the selected point
   * @param  {number} i Index of the point in the geometry
   * @return {null}
   */
  showPointDetails: function(i) {
    var p = this.pointCloudGeometry.vertices[i];

    // callback outside scope
    if (this.options.onPointSelected) {
      this.options.onPointSelected.apply(this, [p]);
    }

  },
  /**
   * Test function which adds a yellow ring of points
   * @return {null}
   */
  testAddPoints: function () {
    console.log('testAddPoints');

    var payload = { data: 123 };

    for (var i = 0; i < 100; i++) {
      this.addPoint((Math.cos(i) + 1) * 1000, (Math.sin(i) + 1) * 1000, 0, payload);
    }
  },
  /**
   * Add a single point to the cloud's geometry.
   * @param {number} x       X position
   * @param {number} y       Y position
   * @param {number} z       Z position
   * @param {object} payload Instance data
   */
  addPoint: function(x, y, z, payload) {
    // console.log('addPoint', x, y, z, payload);
    this.addPointsQueue.push({ x: x, y: y, z: z, payload: payload });
  },
  /**
   * Update an existing point of the cloud's geometry.
   * @param {number} i       Index of the point in the geometry
   * @param {number} x       X position
   * @param {number} y       Y position
   * @param {number} z       Z position
   * @param {object} payload Instance data
   * @param {object} color Three.Color object for the point color
   * @param {number} size Particle size
   */
  updatePoint: function (i, x, y, z, payload, color, size) {
    if (!i || typeof i !== 'number') {
      console.error('Could not update point. Invalid index.', i);
      return;
    }
    this.updatePointsQueue.push({ i: i, x: x, y: y, z: z, payload: payload, color: color, size: size })
  },
  /**
   * Update an existing point of the cloud's geometry.
   * @param {number} i       Index of the point in the geometry
   * @param {number} x       X position
   * @param {number} y       Y position
   * @param {number} z       Z position
   * @param {object} payload Instance data
   * @param {object} color Three.Color object for the point color
   * @param {number} size Particle size
   */
  deletePoint: function (i) {
    this.deletePointsQueue.push({ i: i })
  },
  /**
   * Test function which moves n points to the center of the point cloud.
   * @param  {number} n How many points to move
   * @return {null}
   */
  testMovePoints: function(n) {
    console.log('testMovePoints');

    for (var i = 0; i < n; i++) {
      var pX = Math.random() * this.options.size / 10 - (this.options.size / 10 / 2),
          pY = Math.random() * this.options.size / 10 - (this.options.size / 10 / 2),
          pZ = Math.random() * this.options.size / 10 - (this.options.size / 10 / 2);

      this.updatePoint(i, pX, pY, pZ, {}, null, null);
    }
  },
  /**
   * Event handler for when the window is resized
   * @return {null}
   */
  onWindowResize: function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.render();
  },
  /**
   * Event handler for when the cursor (or touch) moves
   * @return {null}
   */
  onMouseMove: function(event) {
    event.preventDefault();

    this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  },
  /**
   * Event handler for when the mouse (or finger) taps down
   * @return {null}
   */
  onMouseDown: function() {
    this.checkForIntersections = true;
  },
  /**
   * Event handler for when the mouse (or finger) lifts up
   * @return {null}
   */
  onMouseUp: function() {
    this.checkForIntersections = false;
  }
});
