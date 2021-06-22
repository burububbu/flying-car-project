/*
ORDER
name         index
"MainBody",
"LFrontWheel", 0
"RFrontWheel", 1
"LBackWheel",  2
"RBackWheel",  3
*/

import {
  create1PixelTexture,
  getParts,
  loadTextures,
} from "./customGlUtils.js";
import * as utils from "./utils.js";

// -------- some constant values used for the computing of steps
const speedSteering = 3.4; // sterzo
const speedSteeringReturn = 0.93;
const accMax = 0.0021; // max accelaration

// speed % mantained (= 1 -> no friction, << 1 high friction)
// let frictions = [0.991, 0.8, 1.0]; here it's like ice
// null friction on y
const frictions = [0.8, 1, 0.991]; // if I change the friction on x, the car slides

// NB: max speed = accMax*friction on z / (1-friction on z)
const radiusFWheel = 0.25; // front wheel
const grip = 0.45; // how much the vehicle adapts to the steering

class Car {
  async load(gl, path, filename) {
    this._setDefault(gl);

    this.centers = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    this.keys = [false, false, false, false];

    this.carSections = await this._loadParts(gl, path, filename);

    // internal car state, modified through time by the doStep method
    this.state = {
      px: 0, // position
      py: 0, // position
      pz: 0, // position
      facing: 0, // orientation
      hub: 0, // (mozzo)
      steering: 0,
      vx: 0, // actual speed
      vy: 0, // actual speed
      vz: 0, // actual speed
    };
  }

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

    

    loadTextures(gl, materials, path, this.defaultTextures);

    return carPartsObj.map((part) =>
      getParts(gl, part, materials, this.defaultMaterial)
    );
  }

  // do a physic step of the car (delta-t constant)
  doStep() {
    let vxm, vym, vzm; // car space speed

    // from worls da vel frame mondo a vel frame macchina
    let cosf = Math.cos((this.state.facing * Math.PI) / 180.0);
    let sinf = Math.sin((this.state.facing * Math.PI) / 180.0);

    vxm = +cosf * this.state.vx - sinf * this.state.vz;
    vym = this.state.vy;
    vzm = +sinf * this.state.vx + cosf * this.state.vz;

    // steeling handler (based on keys set to true)
    if (this.keys[2]) this.state.steering -= speedSteering; //a
    if (this.keys[3]) this.state.steering += speedSteering; //d
    this.state.steering *= speedSteeringReturn;

    if (this.keys[0]) vzm += accMax; // go ahead
    if (this.keys[1]) vzm -= accMax; // go back

    // apply frictions
    vxm *= frictions[0];
    vym *= frictions[1];
    vzm *= frictions[2];

    // car orientation follows steering orientation (also related to the speed on z)
    this.state.facing = this.state.facing - vzm * grip * this.state.steering;

    // wheels hub rotation (arelated to the speed in z)
    let da = (180.0 * vzm) / (Math.PI * radiusFWheel); //delta angolo
    this.state.hub += da;

    // returns to the world frame speed
    this.state.vx = +cosf * vxm + sinf * vzm;
    this.state.vy = vym;
    this.state.vz = -sinf * vxm + cosf * vzm;

    // compute car position
    // new position = old position + speed * delta t
    this.state.px += this.state.vx;
    this.state.py += this.state.vy;
    this.state.pz += this.state.vz;

    this._updateMatrices();
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

  getCenter(){
    return [this.state.px, this.state.py, this.state.pz]
  }

  _updateMatrices() {
    // base matrix (relative to the body)
    let matrix = m4.translation(this.state.px, this.state.py, this.state.pz); // translate to the actual position
    matrix = m4.yRotate(matrix, utils.degToRad(this.state.facing));
    // update body
    this._updateAllWorldMatrices(0, matrix);


    // L front wheel ind: 1
    let temp_matrix = m4.copy(matrix);
    // return to the initial position
    temp_matrix = m4.translate(temp_matrix, ...this.centers[1]);
    temp_matrix = m4.yRotate(temp_matrix, -utils.degToRad(this.state.steering));
    temp_matrix = m4.xRotate(temp_matrix, utils.degToRad(this.state.hub));
    // translate to center
    temp_matrix = m4.translate(
      temp_matrix,
      -this.centers[1][0],
      -this.centers[1][1],
      -this.centers[1][2]
    );

    this._updateAllWorldMatrices(1, temp_matrix);

    // R front wheel ind: 2
    temp_matrix = m4.copy(matrix);
    // return to the initial position
    temp_matrix = m4.translate(temp_matrix, ...this.centers[2]);

    temp_matrix = m4.yRotate(temp_matrix, -utils.degToRad(this.state.steering));
    temp_matrix = m4.xRotate(temp_matrix, utils.degToRad(this.state.hub));

    temp_matrix = m4.translate(
      temp_matrix,
      -this.centers[2][0],
      -this.centers[2][1],
      -this.centers[2][2]
    );

    this._updateAllWorldMatrices(2, temp_matrix);

    // L back wheel ind: 3
    temp_matrix = m4.copy(matrix);

    temp_matrix = m4.translate(temp_matrix, ...this.centers[3]);
    temp_matrix = m4.xRotate(temp_matrix, utils.degToRad(this.state.hub));
    temp_matrix = m4.translate(
      temp_matrix,
      -this.centers[3][0],
      -this.centers[3][1],
      -this.centers[3][2]
    );
    this._updateAllWorldMatrices(3, temp_matrix);

    // R back wheel ind: 4
    temp_matrix = m4.copy(matrix);

    temp_matrix = m4.translate(temp_matrix, ...this.centers[4]);
    temp_matrix = m4.xRotate(temp_matrix, utils.degToRad(this.state.hub));

    temp_matrix = m4.translate(
      temp_matrix,
      -this.centers[4][0],
      -this.centers[4][1],
      -this.centers[4][2]
    );

    this._updateAllWorldMatrices(4, temp_matrix);
  }

  _updateAllWorldMatrices(index, matrix) {
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
