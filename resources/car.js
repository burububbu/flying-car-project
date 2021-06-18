/*
graph scene:
               vehicle
                |   | 
               fw   bw

*/

import {
  create1PixelTexture,
  getParts,
  loadTextures,
} from "./customGlUtils.js";
import * as utils from "./utils.js";

class Car {
  // default constructor for now
  constructor() {
    this.body = {};
    this.frontWheels = {};
    this.backWheels = {};

    this.center = [0, 0, 0];
  }

  async loadObjects(
    gl,
    path,
    bodyFilename,
    frontWFilename,
    backWFilename,
    programInfo
  ) {
    this._setDefault(gl);

    // parts = [{bufferinfo, material}, {bufferinfo, material}, {bufferinfo, material} ]
    this.body = await this._loadParts(gl, path, bodyFilename, true);
    this.frontWheels = await this._loadParts(gl, path, frontWFilename, false);
    this.backWheels = await this._loadParts(gl, path, backWFilename, false);

    // set programInfo (scene use a default one)
    // this.body.programInfo = programInfo;
    // this.frontWheels.programInfo = programInfo;
    // this.backWheels.programInfo = programInfo;

    // this.bodyuniforms.u_world = m4.translation(6, 0, 0);

    // create a relation by parts

    // to add uniforms and
    //     earthNode.drawInfo = {
    //       uniforms: {},
    //       programInfo: programInfo,
    //       bufferInfo: FbufferInfo,
    //     };
    //     this.objects = [vehicle, wheel1, wheel2, wheel3, wheel4];
    //     this.objectsToDraw = [
    //       vehicle.drawInfo,
    //       wheel1.drawInfo,
    //       wheel2.drawInfo,
    //       wheel3.drawInfo,
    //       wheel4.drawInfo,
    //     ];
  }

  getCarParts() {
    //[{parts:, uniform:}, {parts:, uniform:}, {parts:, uniform:}]
    return [...this.frontWheels, ...this.body, ...this.backWheels];
  }

  // compute only the first time, then we applied to it the transformations (???)
  getCarCenter(obj) {
    let minMax = getGeometriesExtents(obj.geometries);
    minMax.min.forEach((mi, idx) => {
      this.center[idx] = (minMax.max[idx] + mi) / 2;
    });
    console.log(this.center);
  }

  async _loadParts(gl, path, filename, getCenter) {
    let [obj, materials] = await utils.loadOBJ(path, filename);
    if (getCenter) this.getCarCenter(obj);

    loadTextures(gl, materials, path, this.defaultTextures);

    return getParts(gl, obj, materials, this.defaultMaterial);
  }

  /*
  up
  down
  left
  right
  */

  activeListeners() {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) {
        switch (e.key) {
          // w = - on z azis
          // s = + in z axis
          case "w":
            console.log("hello this is w");

            break;
          case "a":
            console.log("hello this is a");
            break;
          case "s":
            console.log("hello this is s");
            break;
          case "d":
            console.log("hello this is d");
            break;
          default:
            break;
        }
      }
    });
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

// Node concept for graph scene
class Node {
  constructor() {
    this.parent = null;
    this.children = [];
    this.localMatrix = m4.identity();
    this.worldMatrix = m4.identity();
    this.drawInfo = null;
  }

  setParent(parent) {
    // remove us from our parent (we can have only a parent)
    if (this.parent) {
      let index = this.parent.children.indexOf(this);

      if (index >= 0) this.parent.children.splice(index, 1);
    }

    // add us to our new parent
    parent.children.push(this);

    // set our new parent
    this.parent = parent;
  }

  updateWorldMatrix(parentWorldMatrix) {
    if (parentWorldMatrix) {
      // a matrix was passed in so do the math
      m4.multiply(parentWorldMatrix, this.localMatrix, this.worldMatrix);
    } else {
      // no matrix was passed in so just copy local to world
      m4.copy(this.localMatrix, this.worldMatrix);
    }

    // now process all the children
    var worldMatrix = this.worldMatrix;
    this.children.forEach(function (child) {
      child.updateWorldMatrix(worldMatrix);
    });
  }
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
