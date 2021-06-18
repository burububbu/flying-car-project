// scene handler: in this way we can create different scenes

import { Camera } from "./camera.js";
import { Car } from "./car.js";
import {
  create1PixelTexture,
  getParts,
  loadTextures,
} from "./customGlUtils.js";
import * as utils from "./utils.js";

let setView = {
  zNear: 1,
  zFar: 4000,
  fieldOfView: 60,
};

// the scene shares a unique programInfo
class Scene {
  // cube to collect = [cube1, cube2.]
  constructor(gl, programInfo, lightPosition, cam, canvas) {
    // create camera
    this.camera = new Camera(cam.D, cam.theta, cam.phi, cam.up, cam.target);
    this.camera.activeListeners(canvas);

    this.gl = gl;
    this.programInfo = programInfo;

    this._setDefault(); // initialize defaults

    this.lightPosition = lightPosition; // [...lightPosition] if more than one light
  }

  async loadScene(
    path, // ./obj/
    groundFile, // terrain -> terrain/terrain.obj
    backgroundFile,
    carFiles, // [vehicle, front wheels, back wheels]
    cubeFile
  ) {
    // personal uniforms -> u_world = identity()
    this.ground = await this._loadParts(path, groundFile);
    this.ground.uniforms = {};

    this.background = await this._loadParts(path, backgroundFile);
    this.background.uniforms = {};

    this.car = new Car();
    await this.car.loadObjects(
      this.gl,
      path + carFiles[0] + "/",
      carFiles[0],
      carFiles[1],
      carFiles[2],
      this.programInfo
    );

    this.camera.target = this.car.center;

    //TODO cubeFile
  }

  // obj file must be in a folder with the same name
  async _loadParts(path, filename) {
    let realpath = path + filename + "/";

    let [obj, materials] = await utils.loadOBJ(
      realpath, // es: obj/terrain/
      filename // terrain.obj
    );
    loadTextures(this.gl, materials, realpath, this.defaultTextures);

    return getParts(this.gl, obj, materials, this.defaultMaterial);
    // uniforms:
    // programInfo:
  }

  render(time) {
    time *= 0.001; // converts to seconds

    webglUtils.resizeCanvasToDisplaySize(this.gl.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.enable(this.gl.DEPTH_TEST);

    this.gl.useProgram(this.programInfo.program); // TO SET

    let u_world = m4.identity();

    this.computeAndSetSharedUniforms(this.gl, this.programInfo);

    // this.camera.target(car.center);

    for (const { bufferInfo, material, uniforms } of [
      ...this.ground,
      ...this.background,
      ...this.car.getCarParts(),
    ]) {
      // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
      webglUtils.setBuffersAndAttributes(this.gl, this.programInfo, bufferInfo);
      // calls gl.uniform
      webglUtils.setUniforms(
        this.programInfo,
        {
          // sostituire with uniforms
          u_world,
        },
        material
      );
      // calls gl.drawArrays or gl.drawElements
      webglUtils.drawBufferInfo(this.gl, bufferInfo);
    }

    requestAnimationFrame(this.render.bind(this));
  }

  computeAndSetSharedUniforms() {
    let projection = m4.perspective(
      utils.degToRad(setView.fieldOfView),
      this.gl.canvas.clientWidth / this.gl.canvas.clientHeight, //aspect
      setView.zNear,
      setView.zFar
    );

    // Make a view matrix from the camera matrix.
    let view = m4.inverse(this.camera.getMatrix());

    // let view = m4.inverse(
    //   m4.lookAt(this.camera.cartesianCoord, [0, 0, 0], [0, 1, 0])
    // );

    const sharedUniforms = {
      u_lightPosition: this.lightPosition,
      u_view: view,
      u_projection: projection,
      // u_viewWorldPosition: camera.getCartesianCoord(),
      u_viewWorldPosition: this.camera.cartesianCoord,
    };

    webglUtils.setUniforms(this.programInfo, sharedUniforms);
  }

  // calc shred uniforms

  // for each object draw and compute personal uniforms

  _setDefault() {
    this.defaultTextures = {
      defaultWhite: create1PixelTexture(this.gl, [255, 255, 255, 255]),
      defaultNormal: create1PixelTexture(this.gl, [127, 127, 255, 0]),
    };

    this.defaultMaterial = {
      diffuseMap: this.defaultTextures.defaultWhite,
      normalMap: this.defaultTextures.defaultNormal,
      specularMap: this.defaultTextures.defaultWhite,
      emissiveMap: this.defaultTextures.defaultWhite,
      diffuse: [1, 1, 1],
      ambient: [1, 1, 1],
      specular: [1, 1, 1],
      shininess: 200,
      opacity: 1,
    };
  }
}

export { Scene };
