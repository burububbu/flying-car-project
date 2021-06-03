// Set of GL utils that are not in WEBGL utils

// create a texture formed by a single color (pixel = [r,g,b,opacità])
function create1PixelTexture(gl, pixel) {
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
function createTexture(gl, source) {
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
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Check if the image is a power of 2
    if (_isPowerOf2(image.width) && _isPowerOf2(image.height)) {
      // generate mipsmap
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      // Turn off mips and set wrapping to clamp to edge.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  });

  return texture;
}

// necessary because mipmaps are not handled well for not 2-power images by webgl
function _isPowerOf2(number) {
  return (number & (number - 1)) === 0;
}

export { create1PixelTexture, createTexture };
