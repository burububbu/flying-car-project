import { parseOBJ, parseMLT } from "./resources/objMTLReader.js";
import * as utils from "./resources/utils.js";

async function main() {
  let path = "./obj/chair/";
  let objectName = "chair";

  let textOBJ = await utils.loadText(path + objectName + ".obj");
  let textMTL = await utils.loadText(path + objectName + ".mtl");

  let dataOBJ = parseOBJ(textOBJ);
  let materialOBJ = parseMLT(textMTL);

  console.log("OBJ: \n", dataOBJ);
  console.log(materialOBJ);
}

main();
