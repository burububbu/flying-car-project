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

const speedRotating = 0.8;
const maxHeight = 2;
const minHeight = 1.5;
const yAdd = 0.001;
const fluctateValue = 0.001;

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

    this.extents = {
      back: [
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ],
      front: [
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY,
      ],
    }; // min and max value (a sort of rectangle that represent the car)

    this.limits = undefined;
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

      zRotate: 0,
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
        if (this.extents.front[ind] > value) this.extents.front[ind] = value;
      });

      max.forEach((value, ind) => {
        if (this.extents.back[ind] < value) this.extents.back[ind] = value;
      });
    }

    loadTextures(gl, materials, path, this.defaultTextures);

    return carPartsObj.map((part) =>
      getParts(gl, part, materials, this.defaultMaterial)
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

    // console.log(backPos, this.limits.min, this.limits.max);

    // sia la z min che maz devono essere comprese tra limits.z min e max
    // sia la z min che maz devono essere comprese tra limits.z min e max

    let value =
      this.limits.min[0] <= Math.min(frontPos[0], backPos[0]) &&
      this.limits.max[0] >= Math.max(frontPos[0], backPos[0]) &&
      this.limits.min[2] <= Math.min(frontPos[1], backPos[1]) &&
      this.limits.max[2] >= Math.max(frontPos[1], backPos[1]);

    // let value =
    //   this.limits.min[0] < frontPos[0] < this.limits.max[0] &&
    //   this.limits.min[2] < frontPos[1] < this.limits.max[2] &&
    //   this.limits.min[0] < backPos[0] < this.limits.max[0] &&
    //   this.limits.min[2] < backPos[1] < this.limits.max[2];

    return value;
  }

  // do a physic step of the car (delta-t constant)

  doStep(fly) {
    // se ci sono limiti la macchina sta andando fuori, reset della posizione a [0,0,0]
    // check limits only for x and z

    if (this.limits && !this.isInside()) {
      this.state.px = 0;
      this.state.py = 0;
      this.state.pz = 0;
    } else {
      let vxm, vym, vzm; // car space speed

      // from worls da vel frame mondo a vel frame macchina
      let cosf = Math.cos((this.state.facing * Math.PI) / 180.0);
      let sinf = Math.sin((this.state.facing * Math.PI) / 180.0);

      vxm = +cosf * this.state.vx - sinf * this.state.vz;
      vzm = +sinf * this.state.vx + cosf * this.state.vz;

      if (!fly) {
        if (this.state.py > 0) {
          vym = this.state.vy - yAdd;
        } else vym = 0;
      } else {
        // fly
        if (this.state.py < maxHeight) {
          // until it reaches the max height
          vym = this.state.vy + yAdd;
        } else {
          // handle this
          vym = 0;
        }
      }

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

      if (fly) {
        if (this.state.zRotate < 30) this.state.zRotate += speedRotating;
      } else {
        if (this.state.zRotate > 0) {
          this.state.zRotate -= speedRotating;
        } else this.state.zRotate = 0;
      }

      this._updateMatrices(fly);
    }
  }

  activeListeners(pc = true) {
    if (pc) {
      window.addEventListener("keydown", (e) => {
        let ind = ["w", "s", "a", "d"].indexOf(e.key);
        if (ind > -1) this.keys[ind] = true;
      });

      window.addEventListener("keyup", (e) => {
        let ind = ["w", "s", "a", "d"].indexOf(e.key);
        if (ind > -1) this.keys[ind] = false;
      });
    }
  }

  getCenter() {
    return [this.state.px, this.state.py, this.state.pz];
  }

  _updateMatrices(fly) {
    if (!fly) {
      // base matrix (relative to the body)
      let matrix = m4.translation(this.state.px, this.state.py, this.state.pz); // translate to the actual position
      matrix = m4.yRotate(matrix, utils.degToRad(this.state.facing));
      // update body
      this._updateAllWorldMatrices(0, matrix);

      // L front wheel ind: 1
      let temp_matrix = m4.copy(matrix);
      // return to the initial position
      temp_matrix = m4.translate(temp_matrix, ...this.centers[1]);
      temp_matrix = m4.zRotate(
        temp_matrix,
        -utils.degToRad(this.state.zRotate)
      );
      temp_matrix = m4.yRotate(
        temp_matrix,
        -utils.degToRad(this.state.steering)
      );
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

      temp_matrix = m4.zRotate(temp_matrix, utils.degToRad(this.state.zRotate));
      temp_matrix = m4.yRotate(
        temp_matrix,
        -utils.degToRad(this.state.steering)
      );
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

      temp_matrix = m4.zRotate(
        temp_matrix,
        -utils.degToRad(this.state.zRotate)
      );
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
      temp_matrix = m4.zRotate(temp_matrix, utils.degToRad(this.state.zRotate));
      temp_matrix = m4.xRotate(temp_matrix, utils.degToRad(this.state.hub));

      temp_matrix = m4.translate(
        temp_matrix,
        -this.centers[4][0],
        -this.centers[4][1],
        -this.centers[4][2]
      );

      this._updateAllWorldMatrices(4, temp_matrix);
    } else {
      // the car flies
      // base matrix (relative to the body)

      let matrix = m4.translation(this.state.px, this.state.py, this.state.pz); // translate to the actual position

      matrix = m4.zRotate(matrix, -utils.degToRad(this.state.vx * 100));
      matrix = m4.xRotate(matrix, utils.degToRad(this.state.vz * 80));
      matrix = m4.yRotate(matrix, utils.degToRad(this.state.facing));

      // update body
      this._updateAllWorldMatrices(0, matrix);

      // let matrix = m4.translation(this.state.px, this.state.py, this.state.pz); // translate to the actual position

      // // facing also for rotating right / left
      // matrix = m4.xRotate(matrix, utils.degToRad(this.state.vz * 100));
      // matrix = m4.yRotate(matrix, -utils.degToRad(this.state.facing - 10));

      // matrix = m4.zRotate(matrix, utils.degToRad(this.state.facing));

      // update body
      // this._updateAllWorldMatrices(0, matrix);

      // L front wheel ind: 1
      let temp_matrix = m4.copy(matrix);
      // return to the initial position
      temp_matrix = m4.translate(temp_matrix, ...this.centers[1]);

      temp_matrix = m4.zRotate(
        temp_matrix,
        -utils.degToRad(this.state.zRotate)
      );
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

      temp_matrix = m4.zRotate(temp_matrix, utils.degToRad(this.state.zRotate));
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
      temp_matrix = m4.zRotate(
        temp_matrix,
        -utils.degToRad(this.state.zRotate)
      );
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
      temp_matrix = m4.zRotate(temp_matrix, utils.degToRad(this.state.zRotate));

      temp_matrix = m4.translate(
        temp_matrix,
        -this.centers[4][0],
        -this.centers[4][1],
        -this.centers[4][2]
      );

      this._updateAllWorldMatrices(4, temp_matrix);
    }
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
