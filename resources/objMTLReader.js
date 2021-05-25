const keywordRE = /(\w*)(?: )*(.*)/; // the same for obj and mtl

function parseOBJ(text) {
  // fill the 0th value with 0. The system is 1 based.
  let positionsOBJ = [[0, 0, 0]];
  let texcoordsOBJ = [[0, 0]];
  let normalsOBJ = [[0, 0, 0]];

  // data obj-style
  let objVertexData = [positionsOBJ, texcoordsOBJ, normalsOBJ];

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
    // If there is an existing geometry and it's not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  // set geometry only if it's undefined
  function setGeometry() {
    if (geometry === undefined) {
      let position = [];
      let texcoord = [];
      let normal = [];

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

    if (!elements) return;

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
    v: (parts, _) => positionsOBJ.push(parts.map(parseFloat)),
    vn: (parts, _) => normalsOBJ.push(parts.map(parseFloat)),
    vt: (parts, _) => texcoordsOBJ.push(parts.map(parseFloat)),
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

function parseMLT() {}

// to use for obj and mtl
function _parse(line, keywords) {
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
export { parseOBJ, parseMLT };
