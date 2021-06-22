/*
ORDER
name         index
"MainBody",
"LFrontWheel", 0
"RFrontWheel", 1
"LBackWheel",  2
"RBackWheel",  3
*/

// compute the distance from the origin for the center of each obj

import {
  create1PixelTexture,
  getParts,
  loadTextures,
} from "./customGlUtils.js";
import * as utils from "./utils.js";

// constant values used for the computing of steps

let velSterzo = 3.4;
let velRitornoSterzo = 0.93;
let accMax = 0.0021;

// attriti, % di velocità che viene mantenuta (= 1 -> no attrito, << 1 molto attrito)
let attritoZ = 0.991; // piccolo attrito sulla Z (nel senso di rotolamento delle ruote)
let attritoX = 0.8; // grande attrito sulla X (per non fare slittare la macchina)
let attritoY = 1.0; // attrito sulla y nullo

// Nota: vel max = accMax*attritoZ / (1-attritoZ)

let raggioRuotaA = 0.25;
let raggioRuotaP = 0.3;

let grip = 0.45; // quanto il facing macchina si adegua velocemente allo sterzo

class Car {
  async load(gl, path, filename, programInfo) {
    this._setDefault(gl);
    this.centers = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    this.distancesOrigin = [];

    this.keys = [false, false, false, false];

    this.carSections = await this._loadParts(gl, path, filename);

    // internal car state, modified through time by the doStep method
    this.state = {
      px: 0, // position
      py: 0, // position
      pz: 0, // position
      facing: 0, // orientation
      mozzoA: 0,
      mozzoP: 0,
      sterzo: 0,
      vx: 0, // actual speed
      vy: 0, // actual speed
      vz: 0, // actual speed
    };
  }

  getCarParts() {
    //[{parts:, uniform:}, {parts:, uniform:}, {parts:, uniform:}]
    return this.carSections;
  }

  // here filter based on 4 wheels and body
  async _loadParts(gl, path, filename) {
    let [obj, materials] = await utils.loadOBJ(path, filename);
    let carPartsObj = [];

    // filter car sections
    [
      "MainBody",
      "LFrontWheel",
      "RFrontWheel",
      "LBackWheel",
      "RBackWheel",
    ].forEach((partName) =>
      carPartsObj.push({
        geometries: obj.geometries.filter(
          (geometry) => geometry.object == partName
        ),
      })
    );

    // computed all centers
    carPartsObj.forEach((obj, ind) => {
      let minMax = utils.getGeometriesExtents(obj.geometries);

      minMax.min.forEach((minValue, index) => {
        this.centers[ind][index] = (minMax.max[index] + minValue) / 2;
      });
    });

    this.computeDistanceOrigin();

    loadTextures(gl, materials, path, this.defaultTextures);

    return carPartsObj.map((part) =>
      getParts(gl, part, materials, this.defaultMaterial)
    );
  }

  // asp semplicemente devo cambiare segno
  computeDistanceOrigin() {
    this.centers.forEach((center) =>
      this.distancesOrigin.push([0 - center[0], 0 - center[1], 0 - center[2]])
    );

    console.log(...this.centers);
    console.log(this.distancesOrigin);
  }

  activeListeners() {
    window.addEventListener("keydown", (e) => {
      let ind = ["w", "s", "a", "d"].indexOf(e.key);
      if (ind > -1) this.keys[ind] = true;
    });

    window.addEventListener("keyup", (e) => {
      let ind = ["w", "s", "a", "d"].indexOf(e.key);
      if (ind > -1) this.keys[ind] = false;
    });
  }

  // do a physic step of the car (delta-t constant)
  // fa evolvere le variabili nel tempo (da richiamare ogni volta della funzione render della scena)
  doStep() {
    let vxm, vym, vzm; // velocita' in spazio macchina

    // da vel frame mondo a vel frame macchina
    let cosf = Math.cos((this.state.facing * Math.PI) / 180.0);
    let sinf = Math.sin((this.state.facing * Math.PI) / 180.0);

    vxm = +cosf * this.state.vx - sinf * this.state.vz;
    vym = this.state.vy;
    vzm = +sinf * this.state.vx + cosf * this.state.vz;

    // sterzo handler (based on keys set to true)
    if (this.keys[2]) this.state.sterzo -= velSterzo; //a
    if (this.keys[3]) this.state.sterzo += velSterzo; //d
    this.state.sterzo *= velRitornoSterzo;

    if (this.keys[0]) vzm += accMax; // vai avanti
    if (this.keys[1]) vzm -= accMax; // vai indietro

    // apply the attriti
    vxm *= attritoX;
    vym *= attritoY;
    vzm *= attritoZ;

    // l'orientamento della macchina segue quello dello sterzo
    // (a seconda della velocita' sulla z)
    this.state.facing = this.state.facing - vzm * grip * this.state.sterzo;

    // rotazione mozzo ruote (a seconda della velocita' sulla z)
    let da = (180.0 * vzm) / (Math.PI * raggioRuotaA); //delta angolo
    this.state.mozzoA += da;

    da = (180.0 * vzm) / (Math.PI * raggioRuotaP);
    this.state.mozzoP += da;

    // ritorno a vel coord mondo
    this.state.vx = +cosf * vxm + sinf * vzm;
    this.state.vy = vym;
    this.state.vz = -sinf * vxm + cosf * vzm;

    // compute position px py an pz
    // position = old position + speed * delta t
    this.state.px += this.state.vx;
    this.state.py += this.state.vy;
    this.state.pz += this.state.vz;

    this.updateMatrices();
  }

  updateMatrices() {
    // base matrix (relative to the body)
    let matrix = m4.translation(this.state.px, this.state.py, this.state.pz);
    matrix = m4.yRotate(matrix, utils.degToRad(this.state.facing));

    // update body
    this.updateAllMat(0, matrix);

    // L front wheel ind: 1
    let mo_matrix1 = m4.copy(matrix);
    // return to the initial position
    mo_matrix1 = m4.translate(mo_matrix1, ...this.centers[1]);

    mo_matrix1 = m4.yRotate(mo_matrix1, -utils.degToRad(this.state.sterzo));
    mo_matrix1 = m4.xRotate(mo_matrix1, utils.degToRad(this.state.mozzoA));
    // translate to center
    mo_matrix1 = m4.translate(
      mo_matrix1,
      -this.centers[1][0],
      -this.centers[1][1],
      -this.centers[1][2]
    );

    this.updateAllMat(1, mo_matrix1);

    // R front wheel ind: 2
    mo_matrix1 = m4.copy(matrix);
    // return to the initial position
    mo_matrix1 = m4.translate(mo_matrix1, ...this.centers[2]);

    mo_matrix1 = m4.yRotate(mo_matrix1, -utils.degToRad(this.state.sterzo));
    mo_matrix1 = m4.xRotate(mo_matrix1, utils.degToRad(this.state.mozzoA));

    mo_matrix1 = m4.translate(
      mo_matrix1,
      -this.centers[2][0],
      -this.centers[2][1],
      -this.centers[2][2]
    );

    this.updateAllMat(2, mo_matrix1);

    // L back wheel ind: 3
    mo_matrix1 = m4.copy(matrix);

    mo_matrix1 = m4.translate(mo_matrix1, ...this.centers[3]);
    mo_matrix1 = m4.xRotate(mo_matrix1, utils.degToRad(this.state.mozzoA));
    mo_matrix1 = m4.translate(
      mo_matrix1,
      -this.centers[3][0],
      -this.centers[3][1],
      -this.centers[3][2]
    );
    this.updateAllMat(3, mo_matrix1);

    // R back wheel ind: 4
    mo_matrix1 = m4.copy(matrix);

    mo_matrix1 = m4.translate(mo_matrix1, ...this.centers[4]);
    mo_matrix1 = m4.xRotate(mo_matrix1, utils.degToRad(this.state.mozzoA));

    mo_matrix1 = m4.translate(
      mo_matrix1,
      -this.centers[4][0],
      -this.centers[4][1],
      -this.centers[4][2]
    );

    this.updateAllMat(4, mo_matrix1);

    // ruote -> spostate al centro, ruotate, risistemate
  }

  updateAllMat(index, matrix) {
    for (let { _, uniforms } of this.carSections[index]) {
      uniforms.u_world = matrix;
    }
  }

  _setDefault(gl) {
    this.defaultTextures = {
      defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
      defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
    };

    this.defaultMaterial = {
      diffuseMap: this.defaultTextures.defaultWhite,
      normalMap: this.defaultTextures.defaultNormal,
      specularMap: this.defaultTextures.defaultWhite,
      emissiveMap: this.defaultTextures.defaultWhite,
      diffuse: [1, 1, 1],
      ambient: [1, 1, 1],
      specular: [1, 1, 1],
      shininess: 200,
      opacity: 1,
    };
  }
}

export { Car };
