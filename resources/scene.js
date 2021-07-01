// scene handler: in this way we can create different scenes

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
const possibleY = [0.5, 3];

class Scene {
  constructor(gl, programInfo, programInfoSkybox, lightPosition, cam, canvas) {
    // create camera
    this.camera = new Camera(cam.D, cam.theta, cam.phi, cam.up, cam.target);
    this.camera.activeListeners(canvas);

    this.gl = gl;

    // set programInfos
    this.programInfo = programInfo;
    this.programInfoSkybox = programInfoSkybox;

    // initialize defaults
    this.defaults = getDefault(this.gl);

    this.lightPosition = lightPosition;
  }

  // load scene  objects
  async loadScene(
    path, // ./obj/

    groundFile, // terrain -> terrain/terrain.obj
    backgroundFolder, // containing the skybox images
    carFile,
    cubeFile,

    controlCanvas
  ) {
    this._loadBackground(path + backgroundFolder);

    await this._loadGround(path, groundFile);
    await this._loadCar(path, carFile);
    await this._loadCube(path, cubeFile);

    this.camera.target = this.car.centers[0]; // look at the body of the vehicle

    // load control panel
    this.controlPanel = new ControlPanel(controlCanvas, this.camera, this.car);
  }

  render() {
    webglUtils.resizeCanvasToDisplaySize(this.gl.canvas);
    webglUtils.resizeCanvasToDisplaySize(this.controlPanel.ctx.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    // --------- draw the control panel --------------
    this.controlPanel.drawPanel();

    // ---- compute uniforms useful for both programInfos ---
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
      this.camera.update(this.car.getCenter(), this.car.state.facing + 180);

    // update cube world matrix, handle collision with car
    this._cubeHandler();

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

    requestAnimationFrame(this.render.bind(this));
  }

  async _loadGround(path, groundFile) {
    let groundRes = await this._loadParts(path, groundFile, true);
    this.ground = groundRes.parts;
    this.groundExtents = groundRes.extents; // i'm only interested in x and z
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

    this.car.loadLimits(this.groundExtents); // load terrain limits, the car can't cross them;

    // true ud pc, false if phone or tablet
    this.car.activeListeners();
  }

  async _loadCube(path, cubeFile) {
    this.cubeTranslation = [0, 0, 0]; // initialize first translation

    let cubeRes = await this._loadParts(path, cubeFile, true);
    this.cube = cubeRes.parts;
    this.cubeExtents = cubeRes.extents;

    this._changePositionCube();
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
  async _loadParts(path, filename, getExtents) {
    let realpath = path + filename + "/";
    let extents = [];

    let [obj, materials] = await utils.loadOBJ(
      realpath, // ex: obj/car/
      filename // car.obj
    );

    if (getExtents) {
      extents = utils.getGeometriesExtents(obj.geometries);
    }

    loadTextures(this.gl, materials, realpath, this.defaults.textures); // modify materials, added textures

    return {
      parts: getParts(this.gl, obj, materials, this.defaults.materials),
      extents: extents,
    };
    // uniforms:
    // programInfo:
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
      u_lightPosition: this.lightPosition,
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
