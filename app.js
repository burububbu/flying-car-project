import { parseOBJ, parseMTL } from "./resources/objMTLReader.js";
import * as utils from "./resources/utils.js";

// data useful for the computing of
let setView = {
  cameraTarget: [0, 5, 0],
  cameraPosition: [0, 5, 15],
  zNear: 1,
  zFar: 4000,
  fieldOfView: 60,
  up: [0, 1, 0], // view-up vector
};

async function loadOBJ() {
  let path = "./obj/chair/";
  let objectName = "Chair";

  let textOBJ = await utils.loadText(path + objectName + ".obj");
  let textMTL = await utils.loadText(path + objectName + ".mtl");

  let dataOBJ = parseOBJ(textOBJ); // {geometries : [], materiallibs: []}

  let dataMTL = parseMTL(textMTL);

  // console.log("OBJ: \n", dataOBJ);
  // console.log(materialOBJ);

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

  // ---------------- load shaders and create program ------------------
  let vSrc = await utils.loadText("./shaders/vertexShader.glsl");
  let fSrc = await utils.loadText("./shaders/fragmentShader.glsl");

  let programInfo = webglUtils.createProgramInfo(gl, [vSrc, fSrc]);

  // ------------ load chair object -----------------
  // sOBJ -> all  available materials with settings
  let [dataOBJ, materialsOBJ] = await loadOBJ();
  console.log(dataOBJ);
  console.log(materialsOBJ);

  // create buffer info and material information for each geometry in geometries
  // parts = [element1, element2] where element = {bufferInfo, material}

  // during render time, iterate over parts and draw everything each time
  let parts = dataOBJ.geometries.map(({ material, data }) => {
    let arrays = {
      position: { numComponents: 3, data: data.position },
      normal: { numComponents: 3, data: data.normal },
    };
    let bufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);

    return {
      material: materialsOBJ[material],
      bufferInfo,
    };
  });

  function render(time) {
    time *= 0.001;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // ----  use program -------
    gl.useProgram(programInfo.program);

    computeSharedUniforms(gl, programInfo);

    // word matrix is theorically different for each object
    // in these case all geometries are related to the same object, so we compute it only once
    // are at the same space.
    const u_world = m4.yRotation(time);

    for (const { bufferInfo, material } of parts) {
      // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
      webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      // calls gl.uniform
      let tempdiffuse = [...material.diffuse, 1];
      webglUtils.setUniforms(programInfo, {
        u_world,
        u_diffuse: tempdiffuse,
      });
      // calls gl.drawArrays or gl.drawElements
      webglUtils.drawBufferInfo(gl, bufferInfo);
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// set shared uniforms
function computeSharedUniforms(gl, programInfo) {
  const projection = m4.perspective(
    utils.degToRad(setView.fieldOfView),
    gl.canvas.clientWidth / gl.canvas.clientHeight, //aspect
    setView.zNear,
    setView.zFar
  );
  // Compute the camera's matrix using look at.
  const camera = m4.lookAt(
    setView.cameraPosition,
    setView.cameraTarget,
    setView.up
  );
  // Make a view matrix from the camera matrix.
  const view = m4.inverse(camera);

  const sharedUniforms = {
    u_lightDirection: m4.normalize([-1, 3, 5]),
    u_view: view,
    u_projection: projection,
  };

  webglUtils.setUniforms(programInfo, sharedUniforms);
}

main();
