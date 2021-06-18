// utils
import { parseOBJ, parseMTL } from "./objMTLReader.js";

async function loadText(path) {
  return await fetch(path).then((res) => {
    return res.text();
  });
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad) {
  return rad * (180 / Math.PI);
}

async function loadOBJ(path, name) {
  let textOBJ = await loadText(path + name + ".obj");

  let dataOBJ = parseOBJ(textOBJ); // {geometries : [], materiallibs: []}

  let textMTL = "";
  // there could be different mtl files
  for (let filename of dataOBJ.materialLibs) {
    textMTL += "\n" + (await loadText(path + filename));
  }
  let dataMTL = parseMTL(textMTL); // material characteristics  = {diffue: -, kaMap: filnename}

  return [dataOBJ, dataMTL];
}

export { loadText, degToRad, radToDeg, loadOBJ };
