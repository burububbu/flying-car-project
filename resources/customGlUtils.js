export function create1PixelTexture(gl, pixel) {
  // create a texture formed by a single color (pixel = [r,g,b,alpha])
  let texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array(pixel)
  );

  return texture;
}

export function createTexture(gl, source) {
  // create texture from an image

  let texture = create1PixelTexture(gl, [100, 192, 255, 255]); // default texture

  let image = new Image();
  image.src = source;

  image.addEventListener("load", () => {
    // create texture from images
    gl.bindTexture(gl.TEXTURE_2D, texture);

    //Flips the source data along its vertical axis
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Check if the image is a power of 2
    if (_isPowerOf2(image.width) && _isPowerOf2(image.height))
      gl.generateMipmap(gl.TEXTURE_2D);
    else {
      // Turn off mips and set wrapping to clamp to edge.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  });

  return texture;
}

export function createCubeMapTexture(gl, path) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  let faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      src: path + "/pos-x.png",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      src: path + "/neg-x.png",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      src: path + "/pos-y.png",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      src: path + "/neg-y.png",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      src: path + "/pos-z.png",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      src: path + "/neg-z.png",
    },
  ];

  faceInfos.forEach((faceInfo) => {
    let target = faceInfo.target;
    let src = faceInfo.src;

    // upload the canvas to the cubemap
    // setup each face so it's immediately renderable
    gl.texImage2D(
      target,
      0,
      gl.RGBA,
      1024,
      1024,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    ); // default

    let image = new Image();
    image.src = src;

    image.addEventListener("load", () => {
      // Now that the image has loaded make copy it to the texture.
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });
  });

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

  gl.texParameteri(
    gl.TEXTURE_CUBE_MAP,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );

  return texture;
}

// necessary because webgl doesn't handle well not 2-power images
export function _isPowerOf2(number) {
  return (number & (number - 1)) === 0;
}

function _computeTangents(position, texcoord, indices) {
  // need it for bump mapping

  let getNextIndex = indices
    ? _makeIndexIterator(indices)
    : _makeUnindexedIterator(position);
  let numFaceVerts = getNextIndex.numElements;
  let numFaces = numFaceVerts / 3;

  let tangents = [];
  for (let i = 0; i < numFaces; ++i) {
    let n1 = getNextIndex();
    let n2 = getNextIndex();
    let n3 = getNextIndex();

    let p1 = position.slice(n1 * 3, n1 * 3 + 3);
    let p2 = position.slice(n2 * 3, n2 * 3 + 3);
    let p3 = position.slice(n3 * 3, n3 * 3 + 3);

    let uv1 = texcoord.slice(n1 * 2, n1 * 2 + 2);
    let uv2 = texcoord.slice(n2 * 2, n2 * 2 + 2);
    let uv3 = texcoord.slice(n3 * 2, n3 * 2 + 2);

    let dp12 = m4.subtractVectors(p2, p1);
    let dp13 = m4.subtractVectors(p3, p1);

    let duv12 = subtractVector2(uv2, uv1);
    let duv13 = subtractVector2(uv3, uv1);

    let f = 1.0 / (duv12[0] * duv13[1] - duv13[0] * duv12[1]);
    let tangent = Number.isFinite(f)
      ? m4.normalize(
          m4.scaleVector(
            m4.subtractVectors(
              m4.scaleVector(dp12, duv13[1]),
              m4.scaleVector(dp13, duv12[1])
            ),
            f
          )
        )
      : [1, 0, 0];

    tangents.push(...tangent, ...tangent, ...tangent);
  }

  return tangents;
}
function _makeIndexIterator(indices) {
  let ndx = 0;
  let fn = () => indices[ndx++];
  fn.reset = () => {
    ndx = 0;
  };
  fn.numElements = indices.length;
  return fn;
}

function _makeUnindexedIterator(positions) {
  let ndx = 0;
  let fn = () => ndx++;
  fn.reset = () => {
    ndx = 0;
  };
  fn.numElements = positions.length / 3;
  return fn;
}

let subtractVector2 = (a, b) => a.map((v, ndx) => v - b[ndx]);

export function loadTextures(gl, materials, path, returnBumpMap) {
  // load, create and associate textures to *map fields
  let textures = {};
  let bumpMaps = {}; // materialName = normalTexture

  for (let [materialName, material] of Object.entries(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith("Map"))
      .forEach(([key, filename]) => {
        let texture = textures[filename];

        if (!texture) {
          texture = createTexture(gl, path + filename);
          textures[filename] = texture;
        }

        material[key] = texture; // the modify is propagated

        if (returnBumpMap && key == "normalMap") {
          bumpMaps[materialName] = texture;
        }
      });
  }

  if (returnBumpMap) return bumpMaps;
}

export function getParts(gl, obj, materials, defaultMaterial) {
  // create bufferInfo and material info for each geometry in geometries
  // returns list  [element1, element2] where element = {bufferInfo, material}

  // obj = {geometries: {material, data}, materialLibs }
  return obj.geometries.map(({ material, data }) => {
    // generate tangents if we have data to do this (surface normal + coor of the bump map texture)
    if (data.texcoord && data.normal)
      data.tangent = _computeTangents(data.position, data.texcoord);
    else data.tangent = [1, 0, 0]; // default

    return {
      parts: {
        material: {
          name: material,
          ...defaultMaterial,
          ...materials[material],
        },
        bufferInfo: webglUtils.createBufferInfoFromArrays(gl, data),
      },
      uniforms: { u_world: m4.identity() },
    };
  });
}

export function getDefault(gl) {
  let defaultTextures = {
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
    defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
  };

  let defaultMaterial = {
    diffuseMap: defaultTextures.defaultWhite,
    normalMap: defaultTextures.defaultNormal,
    specularMap: defaultTextures.defaultWhite,
    emissiveMap: defaultTextures.defaultWhite,
    diffuse: [1, 1, 1],
    ambient: [1, 1, 1],
    specular: [1, 1, 1],
    shininess: 200,
    opacity: 1,
  };

  return { textures: defaultTextures, materials: defaultMaterial };
}

export function getQuad() {
  // get a quad that covers the entire clip space
  return {
    position: {
      numComponents: 2,
      data: new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    },
  };
}
