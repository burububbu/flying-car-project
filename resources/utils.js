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
  let dataMTL = parseMTL(textMTL);

  return [dataOBJ, dataMTL];
}

function getExtents(positions) {
  let min = positions.slice(0, 3);
  let max = positions.slice(0, 3);

  for (let i = 3; i < positions.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      let temp = positions[i + j];
      min[j] = Math.min(min[j], temp);
      max[j] = Math.max(max[j], temp);
    }
  }
  return { min, max };
}

function getGeometriesExtents(geometries) {
  let min = Array(3).fill(Number.POSITIVE_INFINITY);
  let max = Array(3).fill(Number.NEGATIVE_INFINITY);

  geometries.forEach((geometry) => {
    let minMax = getExtents(geometry.data.position);

    min = min.map((mi, idx) => Math.min(mi, minMax.min[idx]));
    max = max.map((ma, idx) => Math.max(ma, minMax.max[idx]));
  });

  return { min, max };
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function isMobileDevice() {
  return navigator.userAgent.match(/Android | iPhone/);
}

// phi have to be  0 < phi < (pi - 10°)
function phiCheck(phi, dr) {
  let newPhi = phi + dr;
  return newPhi + dr >= degToRad(20) && newPhi <= degToRad(80) ? newPhi : phi;
}

function setVisibility(elements, value) {
  document.getElementById(elements).style.display = value;
}
export {
  loadText,
  degToRad,
  radToDeg,
  loadOBJ,
  getGeometriesExtents,
  getRandomArbitrary,
  isMobileDevice,
  phiCheck,
  setVisibility,
};
