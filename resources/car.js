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
    this.body = await this._loadParts(gl, path, bodyFilename);
    this.frontWheels = await this._loadParts(gl, path, frontWFilename);
    this.backWheels = await this._loadParts(gl, path, backWFilename);

    // set programInfo
    this.body.programInfo = programInfo;
    this.frontWheels.programInfo = programInfo;
    this.backWheels.programInfo = programInfo;

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
    return [
      ...this.frontWheels.parts,
      ...this.body.parts,
      ...this.backWheels.parts,
    ];
  }

  async _loadParts(gl, path, filename) {
    let [obj, materials] = await utils.loadOBJ(path, filename);

    loadTextures(gl, materials, path, this.defaultTextures);

    return {
      parts: getParts(gl, obj, materials, this.defaultMaterial),
    };
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
