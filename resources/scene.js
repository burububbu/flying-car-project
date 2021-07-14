import { Camera } from "./camera.js";
import { ControlPanel } from "./controlPanel.js";
import { Car } from "./car.js";
import {
  createCubeMapTexture,
  getDefault,
  getParts,
  getQuad,
  loadTextures,
} from "./customGlUtils.js";
import * as utils from "./utils.js";

// constant values
const setView = {
  zNear: 1,
  zFar: 4000,
  fieldOfView: 60,
};
const possibleY = [1, 3.5];

class Scene {
  constructor(gl, programInfo, programInfoSkybox, cam) {
    this.gl = gl;

    // create camera
    this.camera = new Camera(cam.D, cam.theta, cam.phi, cam.up, cam.target);

    // set programInfos
    this.programInfo = programInfo;
    this.programInfoSkybox = programInfoSkybox;

    // initialize defaults
    this.defaults = getDefault(this.gl);

    // bump mapping handler
    this.lastBumpMapping = true;
    this.bumpMaps = { terrain: undefined, cube: undefined };
  }

  // load scene objects
  async loadScene(
    path, // ./obj/

    // the file names and the folders containing the files must have the same names (e.g terrain -> terrain/terrain.obj)
    groundFile,
    backgroundFolder, // containing the skybox images
    carFile,
    cubeFile,

    lightPosition
  ) {
    this._loadBackground(path + backgroundFolder);
    await this._loadGround(path, groundFile);
    await this._loadCar(path, carFile); // not normal map
    await this._loadCube(path, cubeFile);

    this.controlPanel = new ControlPanel(this.camera, this.car, lightPosition);

    this.camera.target = this.car.centers[0]; // look at the body of the vehicle
  }

  render() {
    this._dismissLoading();
    this._firstStartCameraAnimation();
    this._gameAnimation();
  }

  _dismissLoading() {
    document.getElementById("loading").style.display = "none";
    document.getElementById("container").style.display = "block";
  }

  _firstStartCameraAnimation() {
    this.camera.addTheta(utils.degToRad(1));
    this.camera.addD(-0.1);

    this._render();

    if (this.camera.theta <= Math.PI) {
      requestAnimationFrame(this._firstStartCameraAnimation.bind(this));
    } else {
      // enable commands and allow user to use it
      this.controlPanel.enablePanel();
    }
  }

  _gameAnimation() {
    // wrapper to _render
    this._render();
    requestAnimationFrame(this._gameAnimation.bind(this));
  }

  _render() {
    webglUtils.resizeCanvasToDisplaySize(this.gl.canvas);

    if (this.controlPanel.ctx)
      webglUtils.resizeCanvasToDisplaySize(this.controlPanel.ctx.canvas);

    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    // --------- draw the control panel --------------
    this.controlPanel.drawPanel();

    // ---- compute uniforms useful for both programInfo ---
    let { sharedUniformsAll, sharedUniformsSkyBox } =
      this._computeSharedUniforms();

    // --------- draw all except the skybox ----------
    this.gl.enable(this.gl.DEPTH_TEST);

    this.gl.depthFunc(this.gl.LESS);

    this.gl.useProgram(this.programInfo.program);
    webglUtils.setUniforms(this.programInfo, sharedUniformsAll);

    this.car.doStep(); // update car state

    // update camera
    if (this.camera.followTarget)
      this.camera.updateTarget(
        this.car.getCenter(),
        this.car.state.facing + 180
      );

    if (this.camera.firstPerson) {
      this.camera.setFirstPerson(
        this.car.getFirstPerson(),
        this.car.state.facing
      );
    }

    // update cube world matrix, handle collision with car
    this._cubeHandler();

    // set or unset bump textures
    this._handleBumpMapping();

    for (let { parts, uniforms } of [
      ...this.ground,
      ...this.car.carSections.flat(),
      ...this.cube,
    ]) {
      webglUtils.setBuffersAndAttributes(
        this.gl,
        this.programInfo,
        parts.bufferInfo
      );

      webglUtils.setUniforms(this.programInfo, uniforms, parts.material);

      webglUtils.drawBufferInfo(this.gl, parts.bufferInfo);
    }

    //--------- draw the skybox -----------------
    // let our quad pass the depth test at 1.0
    this.gl.depthFunc(this.gl.LEQUAL);

    this.gl.useProgram(this.programInfoSkybox.program);

    webglUtils.setBuffersAndAttributes(
      this.gl,
      this.programInfoSkybox,
      this.background.bufferInfo
    );

    webglUtils.setUniforms(this.programInfoSkybox, sharedUniformsSkyBox);
    webglUtils.drawBufferInfo(this.gl, this.background.bufferInfo);
  }

  _handleBumpMapping() {
    if (this.controlPanel.bumpMapping != this.lastBumpMapping) {
      this.lastBumpMapping = this.controlPanel.bumpMapping;

      // ground
      this.ground.forEach(({ parts, _ }) => {
        parts.material.normalMap = this.lastBumpMapping
          ? this.bumpMaps.terrain[parts.material.name]
          : this.defaults.textures.defaultNormal;
      });

      // cube
      this.cube.forEach(({ parts, _ }) => {
        parts.material.normalMap = this.lastBumpMapping
          ? this.bumpMaps.cube[parts.material.name]
          : this.defaults.textures.defaultNormal;
      });
    }
  }

  async _loadGround(path, groundFile) {
    let groundRes = await this._loadParts(path, groundFile, true, true);

    this.ground = groundRes.parts;
    this.groundExtents = groundRes.extents; // I'm only interested in x and z
    this.bumpMaps.terrain = groundRes.bumpMap; // save bump map (the user may ask to activate it)
  }

  // path -> folder with photos
  _loadBackground(path) {
    // create bufferInfo for a quad that fill the canvas. It's already in clip space.
    let bufferInfoQuad = webglUtils.createBufferInfoFromArrays(
      this.gl,
      getQuad()
    );

    this.background = {
      bufferInfo: bufferInfoQuad,
      uniforms: {
        u_viewDirectionProjectionInverse: m4.identity(),
        u_skybox: createCubeMapTexture(this.gl, path),
      },
    };
  }

  async _loadCar(path, carFile) {
    this.car = new Car();

    await this.car.load(
      this.gl,
      path + carFile + "/",
      carFile,
      this.programInfo
    );

    this.car.loadLimits(this.groundExtents); // load terrain limits, the car can't cross them
  }

  async _loadCube(path, cubeFile) {
    this.cubeTranslation = [0, 0, 0]; // initialize first translation

    let cubeRes = await this._loadParts(path, cubeFile, true, true);

    this.cube = cubeRes.parts;
    this.cubeExtents = cubeRes.extents;
    this.bumpMaps.cube = cubeRes.bumpMap; // save bump map

    this._changePositionCube(); // first time
  }

  _changePositionCube() {
    this.cubeTranslation = [
      utils.getRandomArbitrary(
        this.groundExtents.min[0] + 2,
        this.groundExtents.max[0] - 2
      ),
      possibleY[Math.floor(Math.random() * 2)],
      utils.getRandomArbitrary(
        this.groundExtents.min[2] + 2,
        this.groundExtents.max[2] - 2
      ),
    ];

    let matrix = m4.translation(...this.cubeTranslation);

    // update all uniforms
    for (let { _, uniforms } of this.cube) {
      uniforms.u_world = matrix;
    }
  }

  // obj file must be in a folder with the same name
  async _loadParts(path, filename, getExtents, getBumpMaps) {
    let realpath = path + filename + "/";
    let extents = [];

    let [obj, materials] = await utils.loadOBJ(
      realpath, // ex: obj/car/
      filename // car.obj
    );

    if (getExtents) {
      extents = utils.getGeometriesExtents(obj.geometries);
    }

    let bumpMaps = loadTextures(
      this.gl,
      materials,
      realpath,
      this.defaults.textures,
      getBumpMaps
    ); // modify materials, added textures, optionally return the bump textures

    return {
      parts: getParts(this.gl, obj, materials, this.defaults.materials),
      extents: extents,
      bumpMap: bumpMaps,
    };
  }

  _cubeHandler() {
    for (let { _, uniforms } of this.cube) {
      uniforms.u_world = m4.yRotate(uniforms.u_world, utils.degToRad(1));
    }

    let minValues = this.cubeExtents.min.map(
      (value, index) => value + this.cubeTranslation[index]
    );

    let maxValues = this.cubeExtents.max.map(
      (value, index) => value + this.cubeTranslation[index]
    );

    if (
      this.car.collideWithTheCube({
        min: minValues,
        max: maxValues,
      })
    ) {
      this._changePositionCube();

      this.controlPanel.addCube();
    }
  }

  _computeSharedUniforms() {
    // (all)
    let projection = m4.perspective(
      utils.degToRad(setView.fieldOfView),
      this.gl.canvas.clientWidth / this.gl.canvas.clientHeight, //aspect
      setView.zNear,
      setView.zFar
    );

    // Make a view matrix from the camera matrix. (all)
    let view = m4.inverse(this.camera.getMatrix());

    // Make a viewDirectionProjectionInverse matrix (skybox)
    let viewDirection = m4.copy(view);

    viewDirection[12] = 0;
    viewDirection[13] = 0;
    viewDirection[14] = 0;

    let viewDirectionProjectionInverse = m4.inverse(
      m4.multiply(projection, viewDirection)
    );

    // aggregate the uniforms
    let sharedUniformsAll = {
      u_lightPosition: this.controlPanel.lightPosition,
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: this.camera.cartesianCoord,
    };

    let sharedUniformsSkyBox = {
      u_viewDirectionProjectionInverse: viewDirectionProjectionInverse,
    };

    return { sharedUniformsAll, sharedUniformsSkyBox };
  }
}

export { Scene };
