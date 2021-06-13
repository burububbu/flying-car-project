// scene handler: in this way we can create different scenes

// ground
// ambient
// scene object

class Scene {
  // cube to collect = [cube1, cube2.]
  constructor(camera, lightPosition, ground, background, car, cube) {
    this.camera = camera;
    this.lightPosition = lightPosition; // [...lightPosition] if more than one light
    this.ground = ground;
    this.background = background;
    this.objects = [car, ...cube];
  }

  loadGround() {}

  loadBackground() {
    // it has the center at the origin
    //   if background has as y = 0, object have to had y = 0
    // sposta punto medio all'origine [0, 0, 0] spostalo con blender
    // this.addObjects(this.background...)
  }

  // calc position based on the ground
  addObjects(objects) {}

  render() {}

  // calc shred uniforms

  // for each object draw and compute personal uniforms
}

export { Scene };
