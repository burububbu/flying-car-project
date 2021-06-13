"use strict";

const keywordRE = /(\w*)(?: )*(.*)/; // the same for obj and mtl

function parseOBJ(text) {
  // fill the 0th value with 0. The system is 1 based.
  let objPositions = [[0, 0, 0]];
  let objTexcoords = [[0, 0]];
  let objNormals = [[0, 0, 0]];

  // data obj-style
  const objVertexData = [objPositions, objTexcoords, objNormals];

  // data webgl-style
  let webglVertexData = [
    [], // pos
    [], // texcoords
    [], // normals
  ];

  // save here names of material lib used by the geometry (mtllib keyword)
  let materialLibs = [];
  // save here different geometries (they are divided by usemtl, this because each part with a different material requests different rendering)
  let geometries = [];
  // used to save stuff in geometries
  let geometry;
  // default settings (it's useful bc i have to change these values when parsed from the obj )
  let groups = ["default"];
  let material = "default";
  let object = "default";

  // define here function useful as keyword handlers
  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  // set geometry only if it's undefined
  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [position, texcoord, normal];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }

  // vert = '1\1\1'
  function addVertex(vert) {
    let elements = vert.split("/"); // ['1', '1', '1']

    // loop over i: positions, normal and tex
    elements.forEach((element, i) => {
      if (!element) return;

      let objIndex = parseInt(element); // index of the vertex described in the face

      let index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length); // handler for negative index (-2 + 3)
      // i == 0 for positions, == 1 for tex, == 2 for normals
      webglVertexData[i].push(...objVertexData[i][index]); // ... to unfold bc webgl get continuous elements form array
    });
  }

  let keywordsOBJ = {
    v: (parts, _) => objPositions.push(parts.map(parseFloat)),
    vn: (parts, _) => objNormals.push(parts.map(parseFloat)),
    vt: (parts, _) => objTexcoords.push(parts.map(parseFloat)),
    f: (parts, _) => {
      // here parts is ['1\1\1\', '2\2\2']
      setGeometry();

      let numTriangles = parts.length - 2;

      // necessary bc webgl draws triangles
      for (let i = 0; i < numTriangles; i++) {
        addVertex(parts[0]);
        addVertex(parts[i + 1]);
        addVertex(parts[i + 2]);
      }
    },
    s: (parts, _) => {}, // don't handle this
    mtllib: (_, unparsedArgs) => {
      materialLibs.push(unparsedArgs);
    },
    usemtl: (_, unparsedArgs) => {
      // start a geometry
      material = unparsedArgs; // save actual name of material
      newGeometry();
    },
    g: (parts, _) => {
      groups = parts;
      newGeometry();
    },
    o: (_, unparsedArgs) => {
      object = unparsedArgs;
      newGeometry();
    },
  };

  let lines = text.split("\n");

  lines.forEach((line) => _parse(line, keywordsOBJ));

  // remove any arrays that have no entries
  for (const geo of geometries) {
    geo.data = Object.fromEntries(
      Object.entries(geo.data).filter(([, array]) => array.length > 0)
    );
  }

  return {
    geometries,
    materialLibs,
  };
}

function parseMTL(text) {
  // all materials info {kA: ..., kn: ..., ...}
  let materials = {};
  // current material
  let material;

  let keywordsMTL = {
    newmtl: (_, unparsedArgs) => {
      material = {};
      materials[unparsedArgs] = material;
    },
    Ns: (parts, _) => {
      material.shininess = parseFloat(400);
    },
    Ka: (parts, _) => {
      material.ambient = parts.map(parseFloat);
    },
    Kd: (parts, _) => {
      material.diffuse = parts.map(parseFloat);
    },
    Ks: (parts, _) => {
      material.specular = parts.map(parseFloat);
    },
    Ke: (parts, _) => {
      material.emissive = parts.map(parseFloat);
    },
    Ni: (parts, _) => {
      material.opticalDensity = parseFloat(parts[0]);
    },
    d: (parts, _) => {
      material.opacity = parseFloat(parts[0]);
    },
    illum: (parts, _) => {
      material.illum = parseInt(parts[0]);
    },
    // images used for textures
    map_Kd(_, unparsedArgs) {
      // principal texture
      material.diffuseMap = unparsedArgs;
    },
    map_Ns(_, unparsedArgs) {
      // specifies how shiny a particular surface part have to be. (or how much of the specular reflection is used)
      material.specularMap = unparsedArgs;
    },
    map_Bump(_, unparsedArgs) {
      // bump map = normal map (used to create bump effects)
      material.normalMap = unparsedArgs;
    },
    map_Ke(_, unparsedArgs) {
      // glow texture
      material.emissiveMap = unparsedArgs;
    },

    map_d(_, unparsedArgs) {
      // opacity texture
      material.opacityMap = unparsedArgs;
    },
  };

  let lines = text.split("\n");

  lines.forEach((line) => _parse(line, keywordsMTL));

  return materials;
}

// to use for obj and mtl
function _parse(line, keywords) {
  line = line.trim();
  // line is empty or is a comment
  if (line === "" || line[0] === "#") {
    return;
  }

  let m = keywordRE.exec(line);

  if (!m) {
    return;
  }

  let [, keyword, unparsedArgs] = m;

  let parts = unparsedArgs.split(/\s+/); // divide the args in parts separated by one or + white space
  let handler = keywords[keyword];

  if (!handler) {
    console.error("unhandled keyword:", keyword);
    return;
  }

  // call handler for each type of keyword
  handler(parts, unparsedArgs);
}

// functions to export
export { parseOBJ, parseMTL };
