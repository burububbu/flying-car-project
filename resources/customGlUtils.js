// Set of GL utils that are not in WEBGL utils

// create a texture formed by a single color (pixel = [r,g,b,opacità])
export function create1PixelTexture(gl, pixel) {
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

// create texture from an image
export function createTexture(gl, source) {
  // create a one color texture
  let texture = create1PixelTexture(gl, [100, 192, 255, 255]);

  // then asynchronously load an image
  let image = new Image();
  image.src = source;

  // add event listener to wait the image loading
  image.addEventListener("load", () => {
    // create texture from images
    gl.bindTexture(gl.TEXTURE_2D, texture);

    //Flips the source data along its vertical axis
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Check if the image is a power of 2
    if (_isPowerOf2(image.width) && _isPowerOf2(image.height)) {
      // generate mipsmap

      console.log("is a power of 2");
      gl.generateMipmap(gl.TEXTURE_2D);

      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // FOR THE PLANE
    } else {
      // Turn off mips and set wrapping to clamp to edge.
      console.log("not 2");

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  });

  return texture;
}

// necessary because mipmaps are not handled well for not 2-power images by webgl
export function _isPowerOf2(number) {
  return (number & (number - 1)) === 0;
}

function makeIndexIterator(indices) {
  let ndx = 0;
  const fn = () => indices[ndx++];
  fn.reset = () => {
    ndx = 0;
  };
  fn.numElements = indices.length;
  return fn;
}

function makeUnindexedIterator(positions) {
  let ndx = 0;
  const fn = () => ndx++;
  fn.reset = () => {
    ndx = 0;
  };
  fn.numElements = positions.length / 3;
  return fn;
}

const subtractVector2 = (a, b) => a.map((v, ndx) => v - b[ndx]);

export function computeTangents(position, texcoord, indices) {
  const getNextIndex = indices
    ? makeIndexIterator(indices)
    : makeUnindexedIterator(position);
  const numFaceVerts = getNextIndex.numElements;
  const numFaces = numFaceVerts / 3;

  const tangents = [];
  for (let i = 0; i < numFaces; ++i) {
    const n1 = getNextIndex();
    const n2 = getNextIndex();
    const n3 = getNextIndex();

    const p1 = position.slice(n1 * 3, n1 * 3 + 3);
    const p2 = position.slice(n2 * 3, n2 * 3 + 3);
    const p3 = position.slice(n3 * 3, n3 * 3 + 3);

    const uv1 = texcoord.slice(n1 * 2, n1 * 2 + 2);
    const uv2 = texcoord.slice(n2 * 2, n2 * 2 + 2);
    const uv3 = texcoord.slice(n3 * 2, n3 * 2 + 2);

    const dp12 = m4.subtractVectors(p2, p1);
    const dp13 = m4.subtractVectors(p3, p1);

    const duv12 = subtractVector2(uv2, uv1);
    const duv13 = subtractVector2(uv3, uv1);

    const f = 1.0 / (duv12[0] * duv13[1] - duv13[0] * duv12[1]);
    const tangent = Number.isFinite(f)
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

// load, create and return textures
export function loadTextures(gl, materials, path) {
  // create only to check if a texture with the same name is already loaded
  let textures = {};

  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith("Map"))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureHref = path + filename;
          texture = createTexture(gl, textureHref);
          textures[filename] = texture;
        }
        material[key] = texture; // the modify should be propagated
      });
  }
}

// create bufferInfo and material info for each geometry in geometries
// returns [element1, element2] where element = {bufferInfo, material}

// obj = {geometries: {material, data}, materialLibs }
export function getParts(gl, obj, materials, defaultMaterial) {
  return obj.geometries.map(({ material, data }) => {
    data.color = { value: [1, 1, 1, 1] }; // for now, fixed color

    // generate tangents if whe have data to do this (surface normal + coor of the bump map texture)
    if (data.texcoord && data.normal) {
      data.tangent = computeTangents(data.position, data.texcoord);
    } else {
      // there is no tangent
      data.tangent = [1, 0, 0];
    }

    let bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);

    return {
      parts: {
        material: {
          ...defaultMaterial,
          ...materials[material],
        },
        bufferInfo: bufferInfo,
      },
      uniforms: { u_world: m4.identity() },
    };
  });
}

// for a obj vehicle, share the textures among wheels
