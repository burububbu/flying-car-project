"use strict";

import * as utils from "./resources/utils.js";
import { Scene } from "./resources/scene.js";

async function main() {
  let lightPosition = [0, 30, 0]; // initial ligth position

  let cameraSettings = {
    D: 15, // D
    theta: utils.degToRad(180), // theta with theta = 0 and phi = 90°, we're on z axis
    phi: utils.degToRad(60), // phi
    up: [0, 1, 0], //up
    target: [0, 0, 0], // target
  };

  const canvas = document.getElementById("canvas");
  const panelCanvas = document.getElementById("controlPanel");

  const gl = canvas.getContext("webgl");

  if (!gl) {
    console.log("WebGL is not available");
    return;
  }

  // console.log(
  //   `vendor: ${gl.getParameter(
  //     gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL
  //   )}`
  // );

  // load shaders and program (two different programs for skybox and all the other objects)
  // 1
  let vSrc = await utils.loadText("./shaders/vertexShader.glsl");
  let fSrc = await utils.loadText("./shaders/fragmentShader.glsl");

  let programInfo = webglUtils.createProgramInfo(gl, [vSrc, fSrc]);

  // 2
  let vSrcSB = await utils.loadText("./shaders/vertexShaderSkybox.glsl");
  let fSrcSB = await utils.loadText("./shaders/fragmentShaderSkybox.glsl");

  let programInfoSkybox = webglUtils.createProgramInfo(gl, [vSrcSB, fSrcSB]);

  // create scene
  let scene = new Scene(
    gl,
    programInfo,
    programInfoSkybox,

    lightPosition,
    cameraSettings,

    canvas
  );

  await scene.loadScene(
    "./obj/", // path
    "terrain", // ground
    "skybox", // background
    "DeLorean", // car
    "Cube", // object
    panelCanvas
  );

  scene.render();
}

main();
