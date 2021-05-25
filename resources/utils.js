// utils

async function loadText(path) {
  return await fetch(path).then((res) => {
    return res.text();
  });
}

export { loadText };
