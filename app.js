"use strict";

import * as utils from "./resources/utils.js";
import { Scene } from "./resources/scene.js";

async function main() {
  let lightPosition = [0, 30, 0]; // initial ligth position

  let cameraSettings = {
    D: 40, // D
    theta: utils.degToRad(0), // with theta = 0 and phi = 90°, we're on z axis
    phi: utils.degToRad(60),
    up: [0, 1, 0], //up
    target: [0, 0, 0], // target
  };

  const canvas = document.getElementById("canvas");

  let controlPanel;
  let commands = [];

  if (utils.isMobileDevice()) {
    controlPanel = document.getElementById("controlPanelMobile");
    [
      "upCommand",
      "downCommand",
      "leftCommand",
      "rightCommand",

      "upLeftCommand",
      "upRightCommand",
      "downLeftCommand",
      "downRightCommand",

      "flyCommand",
      "firstPersonCommand",
      "cameraFollowCommand",
      "cameraRotateCommand",
    ].forEach((command) => {
      commands.push(document.getElementById(command));
    });
    document.getElementById("controlPanelPC").style.display = "none";
  } else {
    controlPanel = document.getElementById("controlPanelPC");
    document.getElementById("controlPanelMobile").style.display = "none";
  }

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
    controlPanel,
    commands
  );

  scene.render();
}

main();
