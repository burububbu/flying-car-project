// not only the ontrol canvas but also the values to control (change the car, change the background, the ground, camera settings)
// car movement handled directly y the car

// has the camera object
class ControlPanel {
  // maybe main canvas isn't useful, use window
  constructor(controlCanvas, camera) {
    this.controlCanvas = controlCanvas;

    this.camera = camera;

    // this.cameraSettings = {
    //   follow: false,
    //   rotate: false,
    // };

    this.carSettings = {
      number: 0,
      fly: false,
    };

    this.groundSettings = {
      number: 0,
    };

    this._activeListeners();
  }

  _activeListeners() {
    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "f":
          //   this.cameraSettings.follow = !this.cameraSettings.follow;
          this.camera.followTarget = !this.camera.followTarget;
          this.camera.rotateWithTarget = false;
          break;

        case "r":
          if (this.camera.followTarget)
            this.camera.rotateWithTarget = !this.camera.rotateWithTarget;
          break;

        case "y":
          this.carSettings.fly = !this.carSettings.fly;
          console.log(this.carSettings.fly);
          break;

        default:
          //   console.log(e.key + ": command not recognised");
          break;
      }
    });
  }
}

export { ControlPanel };
