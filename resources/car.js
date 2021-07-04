/*
ORDER
name         index
"MainBody",    0
"LFrontWheel", 1
"RFrontWheel", 2
"LBackWheel",  3
"RBackWheel",  4
*/

import { getDefault, getParts, loadTextures } from "./customGlUtils.js";
import * as utils from "./utils.js";

// -------- some constant values used for the computing of steps
const speedSteering = 3.2; // sterzo
const speedSteeringReturn = 0.93;
const accMax = 0.0021; // max accelaration

const speedRotating = 0.7;
const maxHeight = 3;
const yAdd = 0.001;

const fluctuateValues = [0.0001, 0.01];

// speed % mantained (= 1 -> no friction, << 1 high friction)
// null friction on y
const frictions = [0.8, 1, 0.991]; // if I change the friction on x, the car slides

// NB: max speed = accMax*friction on z / (1-friction on z)
const radiusFWheel = 0.25; // front wheel
const grip = 0.45; // how much the vehicle adapts to the steering

class Car {
  async load(gl, path, filename) {
    this.defaults = getDefault(gl);

    this.centers = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];

    this.extents = {
      front: [
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ],
      back: [
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
      ],
    }; // min and max value (the car is represented by a rectangle)

    this.limits = undefined; // ground limits
    this.keys = [false, false, false, false];

    this.fly = false;

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

      zRotate: 0,
      fluctuate: false,
    };

    // load car parts ["MainBody", "LFrontWheel", "RFrontWheel", "LBackWheel",  "RBackWheel"]
    this.carSections = await this._loadParts(gl, path, filename);
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

    let extents = [];

    // computed all centers
    carPartsObj.forEach((obj, ind) => {
      let minMax = utils.getGeometriesExtents(obj.geometries);

      extents.push(minMax);

      minMax.min.forEach((minValue, index) => {
        this.centers[ind][index] = (minMax.max[index] + minValue) / 2;
      });
    });

    // compute global min and max (with 0 as origin) (then we have to sum to px  py and pz)
    for (let { min, max } of extents) {
      min.forEach((value, ind) => {
        if (this.extents.back[ind] > value) this.extents.back[ind] = value;
      });

      max.forEach((value, ind) => {
        if (this.extents.front[ind] < value) this.extents.front[ind] = value;
      });
    }

    // load tectures in materials
    loadTextures(gl, materials, path, this.defaults.textures);

    return carPartsObj.map((part) =>
      getParts(gl, part, materials, this.defaults.materials)
    );
  }

  loadLimits(limits) {
    /*
      {
        min: [0,0,0],
        max: [0,0,0]
      }    
    */
    this.limits = limits;
  }

  isStopped() {
    return (
      this.state.vz > -0.01 &&
      this.state.vz < 0.01 &&
      this.state.vx > -0.01 &&
      this.state.vx < 0.01
    );
  }

  isInside() {
    // based on front wheels and back wheels
    // i'm interested only in x and z

    let frontPos = [
      this.extents.front[0] + this.state.px,
      this.extents.front[2] + this.state.pz,
    ];

    let backPos = [
      this.extents.back[0] + this.state.px,
      this.extents.back[2] + this.state.pz,
    ];

    // sia la z min che maz devono essere comprese tra limits.z min e max
    // sia la z min che maz devono essere comprese tra limits.z min e max

    let value =
      this.limits.min[0] <= Math.min(frontPos[0], backPos[0]) &&
      this.limits.max[0] >= Math.max(frontPos[0], backPos[0]) &&
      this.limits.min[2] <= Math.min(frontPos[1], backPos[1]) &&
      this.limits.max[2] >= Math.max(frontPos[1], backPos[1]);

    return value;
  }

  collideWithTheCube(cubeExtent) {
    /* {
      min: [],
      max: []
    } */

    // cube min or max are cbeetween min and maz of the car
    let frontPos = [
      // min
      this.extents.front[0] + this.state.px,
      this.extents.front[1] + this.state.py,
      this.extents.front[2] + this.state.pz,
    ];

    let backPos = [
      // max
      this.extents.back[0] + this.state.px,
      this.extents.back[1] + this.state.py,
      this.extents.back[2] + this.state.pz,
    ];

    let rMin =
      cubeExtent.min[0] <= frontPos[0] &&
      cubeExtent.min[0] >= backPos[0] &&
      cubeExtent.min[1] <= frontPos[1] &&
      cubeExtent.min[1] >= backPos[1] &&
      cubeExtent.min[2] <= frontPos[2] &&
      cubeExtent.min[2] >= backPos[2];

    let rMax =
      cubeExtent.max[0] <= frontPos[0] &&
      cubeExtent.max[0] >= backPos[0] &&
      cubeExtent.max[1] <= frontPos[1] &&
      cubeExtent.max[1] >= backPos[1] &&
      cubeExtent.max[2] <= frontPos[2] &&
      cubeExtent.max[2] >= backPos[2];

    return rMin || rMax;
  }

  // do a physic step of the car (delta-t constant)
  doStep() {
    // check limits only for x and z
    if (this.limits && !this.isInside()) {
      this.state.px = 0;
      this.state.py = 0;
      this.state.pz = 0;
    } else {
      let vxm, vym, vzm; // car space speed

      // from world da vel frame mondo a vel frame macchina
      let modifiedFacing = (this.state.facing * Math.PI) / 180.0;
      let cosf = Math.cos(modifiedFacing);
      let sinf = Math.sin(modifiedFacing);

      vxm = +cosf * this.state.vx - sinf * this.state.vz;
      vym = this._getVYM(); // different if the car is flying
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

      // handle the wheels rotation
      if (this.fly) {
        if (this.state.zRotate < 30) this.state.zRotate += speedRotating;
      } else {
        this.state.zRotate =
          this.state.zRotate > 0 ? this.state.zRotate - speedRotating : 0;
      }

      this._updateMatrices();
    }
  }

  _getVYM() {
    let toRet = 0;

    if (this.fly) {
      if (this.state.py < maxHeight) {
        toRet = this.state.fluctuate
          ? this.state.vy + fluctuateValues[0]
          : this.state.vy + yAdd;
      } else {
        // it's fluctuating
        this.state.fluctuate = true;
        toRet = -fluctuateValues[1];
      }
    } else {
      if (this.state.py > 0) {
        toRet = this.state.vy - yAdd;
      }
    }

    return toRet;
  }

  getCenter() {
    return [this.state.px, this.state.py, this.state.pz];
  }

  _updateMatrices() {
    // base matrix (relative to the body)
    let matrix = m4.translation(this.state.px, this.state.py, this.state.pz); // translate to the actual position

    if (this.fly) {
      matrix = m4.zRotate(matrix, -utils.degToRad(this.state.vx * 100));
      matrix = m4.xRotate(matrix, utils.degToRad(this.state.vz * 80));
    }

    matrix = m4.yRotate(matrix, utils.degToRad(this.state.facing));
    // update body
    this._updateAllWorldMatrices(0, matrix);

    // L front wheel ind: 1
    let tempMatrix = m4.copy(matrix);
    let beMatrices = [m4.zRotation(-utils.degToRad(this.state.zRotate))];

    if (!this.fly) {
      beMatrices.push(m4.yRotation(-utils.degToRad(this.state.steering)));
      beMatrices.push(m4.xRotation(utils.degToRad(this.state.hub)));
    }

    this._updateAllWorldMatrices(
      1,
      this._toFromCenter(1, tempMatrix, beMatrices)
    );

    // R front wheel ind: 2
    tempMatrix = m4.copy(matrix);

    beMatrices = [m4.zRotation(utils.degToRad(this.state.zRotate))];

    if (!this.fly) {
      beMatrices.push(m4.yRotation(-utils.degToRad(this.state.steering)));
      beMatrices.push(m4.xRotation(utils.degToRad(this.state.hub)));
    }

    this._updateAllWorldMatrices(
      2,
      this._toFromCenter(2, tempMatrix, beMatrices)
    );

    // L back wheel ind: 3
    tempMatrix = m4.copy(matrix);

    beMatrices = [m4.zRotation(-utils.degToRad(this.state.zRotate))];

    if (!this.fly)
      beMatrices.push(m4.xRotation(utils.degToRad(this.state.hub)));

    this._updateAllWorldMatrices(
      3,
      this._toFromCenter(3, tempMatrix, beMatrices)
    );

    // R back wheel ind: 4
    tempMatrix = m4.copy(matrix);

    beMatrices = [m4.zRotation(utils.degToRad(this.state.zRotate))];

    if (!this.fly)
      beMatrices.push(m4.xRotation(utils.degToRad(this.state.hub)));

    this._updateAllWorldMatrices(
      4,
      this._toFromCenter(4, tempMatrix, beMatrices)
    );
  }

  // get the more higher point of the car
  getFirstPerson() {
    return [
      this.state.px + 0.1,
      this.state.py + this.extents.front[1] + 0.3,
      this.state.pz,
    ];
  }

  _updateAllWorldMatrices(index, matrix) {
    for (let { _, uniforms } of this.carSections[index]) {
      uniforms.u_world = matrix;
    }
  }

  _toFromCenter(index, matrix, betweenMatrix) {
    let temp_m = m4.translate(matrix, ...this.centers[index]);

    betweenMatrix.forEach((mat) => {
      temp_m = m4.multiply(temp_m, mat);
    });

    temp_m = m4.translate(
      temp_m,
      -this.centers[index][0],
      -this.centers[index][1],
      -this.centers[index][2]
    );

    return temp_m;
  }
}

export { Car };
