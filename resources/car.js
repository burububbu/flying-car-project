/*
graph scene:
               vehicle
                |   | 
               fw   bw

*/

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

class Car {
  async load(gl, path, filename, programInfo) {
    this.center = [0, 0, 0];

    this._setDefault(gl);

    this.carSections = await this._loadParts(gl, path, filename);
  }

  getCarParts() {
    //[{parts:, uniform:}, {parts:, uniform:}, {parts:, uniform:}]
    return this.carSections;
  }

  // compute only the first time, then we applied to it the transformations (???)
  getCarCenter(obj) {
    let minMax = getGeometriesExtents(obj.geometries);

    minMax.min.forEach((mi, idx) => {
      this.center[idx] = (minMax.max[idx] + mi) / 2;
    });
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

    this.getCarCenter(carPartsObj[0]); // respect the main body

    loadTextures(gl, materials, path, this.defaultTextures);

    return carPartsObj.map((part) =>
      getParts(gl, part, materials, this.defaultMaterial)
    );
  }

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
