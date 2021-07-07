"use strict";

import * as utils from "./resources/utils.js";
import { Scene } from "./resources/scene.js";

function main() {
  // check browser version
  if (!navigator.userAgent.match(/Chrome\/9[0-1]/)) {
    _blockExecution();
  } else _main();
}

async function _main() {
  let lightPosition = [0, 30, 0]; // initial ligth position

  let cameraSettings = {
    D: 40, // D
    theta: utils.degToRad(0), // with theta = 0 and phi = 90°, we're on z axis
    phi: utils.degToRad(60),
    up: [0, 1, 0], //up
    target: [0, 0, 0], // target
  };

  if (utils.isMobileDevice()) {
    document.getElementById("controlPanelPC").style.display = "none";
  } else {
    document.getElementById("controlPanelMobile").style.display = "none";
  }

  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");

  if (!gl) {
    console.log("WebGL is not available");
    return;
  }

  // load shaders and program (two different programs for skybox and all the other objects)
  // 1
  let vSrc = await utils.loadText("./shaders/vertexShader.glsl");
  let fSrc = await utils.loadText("./shaders/fragmentShader.glsl");

  let programInfo = webglUtils.createProgramInfo(gl, [vSrc, fSrc]);

  // 2
  let vSrcSB = await utils.loadText("./shaders/vertexShaderSkybox.glsl");
  let fSrcSB = await utils.loadText("./shaders/fragmentShaderSkybox.glsl");

  let programInfoSkybox = webglUtils.createProgramInfo(gl, [vSrcSB, fSrcSB]);

  let scene = new Scene(
    gl,
    programInfo,
    programInfoSkybox,

    lightPosition,
    cameraSettings
  );

  await scene.loadScene(
    "./obj/", // path
    "terrain", // ground
    "skybox", // background
    "DeLorean", // car
    "Cube" // object
  );

  scene.render();
}

function _blockExecution() {
  utils.setVisibility("reloadError", "block");
  utils.setVisibility("loader", "none");

  utils.setVisibility("continueButton", "block");

  let button = document.getElementById("continueButton");
  button.style.display = "block";

  button.addEventListener("click", () => {
    button.style.display = "none";
    utils.setVisibility("reloadError", "none");
    utils.setVisibility("loader", "block");

    _main();
  });
}

main();
