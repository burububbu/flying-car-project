// scene handler: in this way we can create different scenes

import { Camera } from "./camera.js";
import { ControlPanel } from "./controlPanel.js";
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
  constructor(gl, programInfo, programInfoSkybox, lightPosition, cam, canvas) {
    // create camera
    this.camera = new Camera(cam.D, cam.theta, cam.phi, cam.up, cam.target);
    this.camera.activeListeners(canvas);
    this.gl = gl;

    this.programInfo = programInfo;
    this.programInfoSkybox = programInfoSkybox;

    this._setDefault(); // initialize defaults

    this.lightPosition = lightPosition; // [...lightPosition] if more than one light
  }

  async loadScene(
    path, // ./obj/
    groundFile, // terrain -> terrain/terrain.obj
    backgroundFolder, //  []
    carFile, // [vehicle, front wheels, back wheels]
    cubeFile,
    controlCanvas
  ) {
    // personal uniforms -> u_world = identity()
    let groundRes = await this._loadParts(path, groundFile, true);

    this.ground = groundRes.parts;
    this.groundExtents = groundRes.extents; // i'm only interested in x and z

    this.background = this.loadBackground(path + backgroundFolder);
    // this.background = await (
    //   await this._loadParts(path, groundFile, false)
    // ).parts;

    this.car = new Car();
    await this.car.load(
      this.gl,
      path + carFile + "/",
      carFile,
      this.programInfo
    );
    this.car.loadLimits(this.groundExtents);

    // true ud pc, false if phone  tablet
    this.car.activeListeners();

    this.camera.target = this.car.centers[0]; // look at the body of the vehicle

    this.controlPanel = new ControlPanel(
      controlCanvas,

      this.camera,
      this.car
    );

    // only one cube
    let cubeRes = await this._loadParts(path, cubeFile, true);
    this.cubeTranslation = [0, 0, 0];

    this.cube = cubeRes.parts;
    this.cubeExtents = cubeRes.extents;

    this.changePositionCube();
  }

  // create texture with photos in the folder
  loadBackground(path) {
    // use a different shader because here we can avoid all matrices transformations

    // create bufferInfo for the quad that fill the canvas
    let array = {
      position: {
        numComponents: 2,
        data: new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      },
    };

    let bufferInfoQuad = webglUtils.createBufferInfoFromArrays(this.gl, array);

    // now create the texture
    let texture = this.gl.createTexture();

    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, texture);

    const faceInfos = [
      {
        target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_X,
        src: path + "/pos-x.png",
      },
      {
        target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        src: path + "/neg-x.png",
      },
      {
        target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        src: path + "/pos-y.png",
      },
      {
        target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        src: path + "/neg-y.png",
      },
      {
        target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
        src: path + "/pos-z.png",
      },
      {
        target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
        src: path + "/neg-z.png",
      },
    ];

    faceInfos.forEach((faceInfo) => {
      let target = faceInfo.target;
      let src = faceInfo.src;

      console.log(src);

      // upload the canvas to the cubemap
      // setup each face so it's immediately renderable
      this.gl.texImage2D(
        target,
        0,
        this.gl.RGBA,
        1024,
        1024,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        null
      ); // default

      let image = new Image();
      image.src = src;

      image.addEventListener("load", () => {
        // Now that the image has loaded make copy it to the texture.
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, texture);
        this.gl.texImage2D(
          target,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          image
        );
        this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);
      });
    });

    this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);
    this.gl.texParameteri(
      this.gl.TEXTURE_CUBE_MAP,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.LINEAR_MIPMAP_LINEAR
    );

    return {
      bufferInfo: bufferInfoQuad,
      uniforms: {
        u_viewDirectionProjectionInverse: m4.identity(),
        u_skybox: texture,
      },
    };
  }

  changePositionCube() {
    let possibleY = [0.5, 3];

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

    for (let { _, uniforms } of this.cube) {
      uniforms.u_world = matrix;
    }
  }

  // obj file must be in a folder with the same name
  async _loadParts(path, filename, getExtents) {
    let realpath = path + filename + "/";
    let extents = [];

    let [obj, materials] = await utils.loadOBJ(
      realpath, // es: obj/terrain/
      filename // terrain.obj
    );

    if (getExtents) {
      extents = utils.getGeometriesExtents(obj.geometries);
    }

    loadTextures(this.gl, materials, realpath, this.defaultTextures);

    return {
      parts: getParts(this.gl, obj, materials, this.defaultMaterial),
      extents: extents,
    };
    // uniforms:
    // programInfo:
  }

  render() {
    webglUtils.resizeCanvasToDisplaySize(this.gl.canvas);
    webglUtils.resizeCanvasToDisplaySize(this.controlPanel.ctx.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.controlPanel.drawPanel();

    // -------------------------------- all -------------------
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LESS);

    this.gl.useProgram(this.programInfo.program); // TO SET

    let viewDirectionProjection = this._computeAndSetSharedUniforms(
      this.gl,
      this.programInfo
    );

    // check if the car can fly, it have to be sopped

    this.car.doStep(this.controlPanel.carSettings.fly);

    if (this.camera.followTarget) {
      this.camera.target = this.car.getCenter();

      if (this.camera.rotateWithTarget)
        this.camera.theta = utils.degToRad(this.car.state.facing + 180);

      this.camera.updateCartesianCoord();
    }

    this.moveCube();

    let minCube = this.cubeExtents.min.map(
      (value, index) => value + this.cubeTranslation[index]
    );

    let maxCube = this.cubeExtents.max.map(
      (value, index) => value + this.cubeTranslation[index]
    );

    if (this.car.collideWithTheCube({ min: minCube, max: maxCube })) {
      this.changePositionCube();
      this.controlPanel.addCube();
    }

    for (let { parts, uniforms } of [
      ...this.ground,
      ...this.car.carSections.flat(),
      ...this.cube,
    ]) {
      // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
      webglUtils.setBuffersAndAttributes(
        this.gl,
        this.programInfo,
        parts.bufferInfo
      );
      // calls gl.uniform

      webglUtils.setUniforms(this.programInfo, uniforms, parts.material);
      // calls gl.drawArrays or gl.drawElements
      webglUtils.drawBufferInfo(this.gl, parts.bufferInfo);
    }

    //-------------------- background (has another programInfo)

    // let our quad pass the depth test at 1.0
    this.gl.depthFunc(this.gl.LEQUAL);

    this.gl.useProgram(this.programInfoSkybox.program);

    webglUtils.setBuffersAndAttributes(
      this.gl,
      this.programInfoSkybox,
      this.background.bufferInfo
    );

    this.background.uniforms.u_viewDirectionProjectionInverse =
      viewDirectionProjection;

    webglUtils.setUniforms(this.programInfoSkybox, this.background.uniforms);
    webglUtils.drawBufferInfo(this.gl, this.background.bufferInfo);
    //---------------------------------------

    requestAnimationFrame(this.render.bind(this));
  }

  moveCube() {
    for (let { _, uniforms } of this.cube) {
      uniforms.u_world = m4.yRotate(uniforms.u_world, utils.degToRad(1));
    }
  }

  _computeAndSetSharedUniforms() {
    let projection = m4.perspective(
      utils.degToRad(setView.fieldOfView),
      this.gl.canvas.clientWidth / this.gl.canvas.clientHeight, //aspect
      setView.zNear,
      setView.zFar
    );

    // Make a view matrix from the camera matrix.
    let view = m4.inverse(this.camera.getMatrix());

    // calc for classic program info
    const sharedUniforms = {
      u_lightPosition: this.lightPosition,
      u_view: view,
      u_projection: projection,
      // u_viewWorldPosition: camera.getCartesianCoord(),
      u_viewWorldPosition: this.camera.cartesianCoord,
    };

    webglUtils.setUniforms(this.programInfo, sharedUniforms);

    // compute viewDirectionProjectionInverse matrix
    let viewDirection = m4.copy(view);

    viewDirection[12] = 0;
    viewDirection[13] = 0;
    viewDirection[14] = 0;

    let viewDirectionProjection = m4.multiply(projection, viewDirection);

    return m4.inverse(viewDirectionProjection);
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
