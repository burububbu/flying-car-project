import { parseOBJ, parseMLT } from "./resources/objMTLReader.js";
import * as utils from "./resources/utils.js";

async function loadOBJ() {
  let path = "./obj/chair/";
  let objectName = "chair";

  let textOBJ = await utils.loadText(path + objectName + ".obj");
  let textMTL = await utils.loadText(path + objectName + ".mtl");

  let dataOBJ = parseOBJ(textOBJ); // {geometries : [], materiallibs: []}
  let materialOBJ = parseMLT(textMTL);

  // console.log("OBJ: \n", dataOBJ);
  // console.log(materialOBJ);

  return [dataOBJ, materialOBJ];
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
  let [dataOBJ, _] = await loadOBJ();

  // create buffer info and material information for each geometry in geometries
  // parts = [element1, element2] where element = {bufferInfo, material}

  // during render time, iterate over parts and draw everything each time
  let parts = dataOBJ.geometries.map(({ data }) => {
    let arrays = {
      position: { numComponents: 3, data: data.position },
      normal: { numComponents: 3, data: data.normal },
    };
    let bufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);

    return {
      material: {
        u_diffuse: [Math.random(), Math.random(), Math.random(), 1],
      },
      bufferInfo,
    };
  });

  let cameraTarget = [0, 0, 0];
  let cameraPosition = [0, 0, 4];
  let zNear = 0.1;
  let zFar = 50;

  let time = 1;

  function render(time) {
    time *= 0.001;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const fieldOfViewRadians = utils.degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
    };

    gl.useProgram(programInfo.program);

    // calls gl.uniform
    webglUtils.setUniforms(programInfo, sharedUniforms);

    // compute the world matrix once since all parts
    // are at the same space.
    const u_world = m4.yRotation(time);

    for (let { bufferInfo, material } of parts) {
      // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
      webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      // calls gl.uniform
      webglUtils.setUniforms(programInfo, {
        u_world,
        u_diffuse: material.u_diffuse,
      });
      // calls gl.drawArrays or gl.drawElements
      webglUtils.drawBufferInfo(gl, bufferInfo);
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();
