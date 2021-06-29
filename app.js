"use strict";

import * as utils from "./resources/utils.js";

import { Scene } from "./resources/scene.js";

// data useful for the computing of the view

let lightPosition = [0, 50, 0];

// set theta and phi to 0 because we are on z axis
let cameraSettings = {
  D: 20, // D
  theta: utils.degToRad(180), // theta with theta = 0 and phi = 90°, we're on z axis
  phi: utils.degToRad(60), // phi
  up: [0, 1, 0], //up
  target: [0, 0, 0], // target
};

async function main() {
  // --------------- init --------------
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");

  if (!gl) {
    console.log("WebGL is not available");
    return;
  }

  console.log(
    `vendor: ${gl.getParameter(
      gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL
    )}`
  );

  // ---------------- load shaders and create program ------------------
  let vSrc = await utils.loadText("./shaders/vertexShader.glsl");
  let fSrc = await utils.loadText("./shaders/fragmentShader.glsl");

  let programInfo = webglUtils.createProgramInfo(gl, [vSrc, fSrc]);

  // create scene
  let scene = new Scene(gl, programInfo, lightPosition, cameraSettings, canvas);
  await scene.loadScene(
    "./obj/", // path
    "terrain", // ground

    "", // background
    "DeLorean", // car
    "Cube", // object
    canvas
  );

  scene.render();
}

main();
