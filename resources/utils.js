// utils

async function loadText(path) {
  return await fetch(path).then((res) => {
    return res.text();
  });
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad) {
  return rad * (180 / Math.PI);
}

// from cartesian coord
function getSphericalCoord(x, y, z) {
  let D = Math.sqrt(Math.pow(x, 2), Math.pow(y, 2), Math.pow(z, 2)); // Sqrt(x^2 + y^2 + z^2)
  return {
    D: D,
    theta: Math.atan(y / x), //arctan
    phi: Math.acos(z / D),
  };
}

// from spherical coord
// D -> distanza punto dall'origine
// theta -> angolo tra
// phi -> angolo tra Z e vettore che porta al punto (x,y,z)
function getCartesianCoord(D, theta, phi) {
  return {
    x: D * Math.sin(phi) * Math.cos(theta),
    y: D * Math.sin(phi) * Math.sin(theta), //arctan
    z: D * Math.cos(phi),
  };
}

export { loadText, degToRad, radToDeg, getCartesianCoord, getSphericalCoord };
