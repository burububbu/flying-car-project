// utils

async function loadText(path) {
  return await fetch(path).then((res) => {
    return res.text();
  });
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export { loadText, degToRad };
