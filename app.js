import { parseOBJ, parseMTL } from "./resources/objMTLReader.js";
import { Camera } from "./resources/camera.js";
import * as utils from "./resources/utils.js";

// data useful for the computing of the view
let setView = {
  zNear: 1,
  zFar: 4000,
  fieldOfView: 60,
};

let lightDirection = m4.normalize([-1, 3, 5]);

// set theta and phi to 0 beacuse we are on z axis
const camera = new Camera(
  400, // D
  utils.degToRad(60), // theta
  utils.degToRad(60), // phi
  [0, 1, 0], //up
  [0, 50, 0] //d
);

async function loadOBJ() {
  let path = "./obj/among us/";
  let objectName = "among us";

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

  // create buffer info and material information for each geometry in geometries
  // parts = [element1, element2] where element = {bufferInfo, material}
  const parts = obj.geometries.map(({ material, data }) => {
    data.color = { value: [1, 1, 1, 1] }; // for now, fixed color

    const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
    return {
      material: materials[material],
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
    let u_world = m4.yRotation(1);
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
  };

  webglUtils.setUniforms(programInfo, sharedUniforms);
}

main();
