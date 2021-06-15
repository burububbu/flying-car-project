"use strict";

import { Camera } from "./resources/camera.js";
import * as utils from "./resources/utils.js";
import { Car } from "./resources/car.js";

// data useful for the computing of the view
let setView = {
  zNear: 1,
  zFar: 4000,
  fieldOfView: 60,
};

let path = "./obj/terrain/";
// let filename = "Silver Retro Car";
let lightPosition = [0, 200, 0];

// set theta and phi to 0 because we are on z axis
const camera = new Camera(
  20, // D
  0, // theta
  20.4, // phi
  [0, 1, 0], //up
  [0, 0, 0] // target
);

async function main() {
  // --------------- init --------------
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");

  if (!gl) {
    console.log("WebGL is not available");
    return;
  }

  camera.activeListeners(canvas);

  console.log(
    `vendor: ${gl.getParameter(
      gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL
    )}`
  );

  // ---------------- load shaders and create program ------------------
  let vSrc = await utils.loadText("./shaders/vertexShader.glsl");
  let fSrc = await utils.loadText("./shaders/fragmentShader.glsl");

  let programInfo = webglUtils.createProgramInfo(gl, [vSrc, fSrc]);

  // ------------ load object -----------------
  // let [obj, materials] = await utils.loadOBJ(path, "terrain"); //[dataOBJ, dataMTL]

  // const defaultTextures = {
  //   defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
  //   defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
  // };

  // const defaultMaterial = {
  //   diffuse: [1, 1, 1],
  //   diffuseMap: defaultTextures.defaultWhite,
  //   normalMap: defaultTextures.defaultNormal,
  //   ambient: [1, 1, 1],
  //   specular: [1, 1, 1],
  //   specularMap: defaultTextures.defaultWhite,
  //   emissiveMap: defaultTextures.defaultWhite,
  //   shininess: 400,
  //   opacity: 1,
  // };

  // // load all textures so, if a texture is used by more material than one, it can be shared
  // // it returns an object with at least the "defaultWhite" and "defaultNormal"
  // loadTextures(gl, materials, path, defaultTextures);

  // // create buffer info and material information for each geometry in geometries
  // const parts = getParts(gl, obj, materials, defaultMaterial);

  let car = new Car();
  await car.loadObjects(gl, path, "terrain", "DeLorean", "", programInfo);
  let parts = car.getCarParts();

  function render(time) {
    time *= 0.001; // convert to seconds

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(programInfo.program);

    computeSharedUniforms(gl, programInfo);

    // compute the world matrix once since all parts
    // are at the same space.
    let u_world = m4.translation(0, 0, 0);
    // u_world = m4.xRotate(u_world, time);
    // u_world = m4.translate(u_world, ...objOffset);

    for (const { bufferInfo, material, uniforms } of parts) {
      // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
      webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      // calls gl.uniform
      webglUtils.setUniforms(
        programInfo,
        {
          u_world,
        },
        material
      );
      // calls gl.drawArrays or gl.drawElements
      webglUtils.drawBufferInfo(gl, bufferInfo);
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

function computeSharedUniforms(gl, programInfo) {
  let projection = m4.perspective(
    utils.degToRad(setView.fieldOfView),
    gl.canvas.clientWidth / gl.canvas.clientHeight, //aspect
    setView.zNear,
    setView.zFar
  );

  // Make a view matrix from the camera matrix.
  // let view = m4.inverse(camera.getMatrix());

  let view = m4.inverse(m4.lookAt(camera.cartesianCoord, [0, 0, 0], [0, 1, 0]));

  const sharedUniforms = {
    u_lightPosition: lightPosition,
    u_view: view,
    u_projection: projection,
    // u_viewWorldPosition: camera.getCartesianCoord(),
    u_viewWorldPosition: camera.cartesianCoord,
  };

  webglUtils.setUniforms(programInfo, sharedUniforms);
}

main();
