"use strict";

import { parseOBJ, parseMTL } from "./resources/objMTLReader.js";
import {
  create1PixelTexture,
  createTexture,
} from "./resources/customGlUtils.js";
import { Camera } from "./resources/camera.js";
import * as utils from "./resources/utils.js";

// data useful for the computing of the view
let setView = {
  zNear: 1,
  zFar: 4000,
  fieldOfView: 60,
};

let path = "./obj/windmill/";
let lightDirection = m4.normalize([-1, 3, 5]);

// set theta and phi to 0 beacuse we are on z axis
const camera = new Camera(
  15, // D
  utils.degToRad(90), // theta
  utils.degToRad(90), // phi
  [0, 1, 0], //up
  [0, 5, 0] // target
);

async function loadOBJ() {
  let objectName = "windmill";

  let textOBJ = await utils.loadText(path + objectName + ".obj");
  let dataOBJ = parseOBJ(textOBJ); // {geometries : [], materiallibs: []}

  let textMTL = "";
  // there could be different mtl files
  for (let filename of dataOBJ.materialLibs) {
    textMTL += "\n" + (await utils.loadText(path + filename));
  }
  let dataMTL = parseMTL(textMTL); // {geometries : [], materiallibs: []}

  return [dataOBJ, dataMTL];
}

async function main() {
  // --------------- init --------------
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    console.log("WebGL is not available");
    return;
  }

  camera.activeListeners(canvas);

  // ---------------- load shaders and create program ------------------
  let vSrc = await utils.loadText("./shaders/vertexShader.glsl");
  let fSrc = await utils.loadText("./shaders/fragmentShader.glsl");

  let programInfo = webglUtils.createProgramInfo(gl, [vSrc, fSrc]);

  // ------------ load object -----------------
  let [obj, materials] = await loadOBJ(); //[dataOBJ, dataMTL]

  // load now all textures so if a  texture is used by more material than one, it can be riutilised
  // it return a object with al lleast the "defaultWhite"

  let textures = {
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
  };

  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith("Map"))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = path + filename;

          texture = createTexture(gl, textureHref);
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }

  const defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    shininess: 400,
    opacity: 1,
  };
  // loadTextures(gl, materials, textures);

  // create buffer info and material information for each geometry in geometries
  // parts = [element1, element2] where element = {bufferInfo, material}
  const parts = obj.geometries.map(({ material, data }) => {
    data.color = { value: [1, 1, 1, 1] }; // for now, fixed color

    const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
    return {
      material: {
        ...defaultMaterial,
        ...materials[material],
      },
      bufferInfo,
    };
  });

  function render(time) {
    time *= 0.001; // convert to seconds

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(programInfo.program);

    computeSharedUniforms(gl, programInfo);

    // compute the world matrix once since all parts
    // are at the same space.
    let u_world = m4.yRotation(time);
    // u_world = m4.translate(u_world, ...objOffset);

    for (const { bufferInfo, material } of parts) {
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
  let view = m4.inverse(camera.getMatrix());

  const sharedUniforms = {
    u_lightDirection: lightDirection,
    u_view: view,
    u_projection: projection,
    u_viewWorldPosition: camera.getCartesianCoord(),
  };

  webglUtils.setUniforms(programInfo, sharedUniforms);
}

main();
