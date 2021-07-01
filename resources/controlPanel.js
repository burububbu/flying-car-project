// not only the ontrol canvas but also the values to control (change the car, change the background, the ground, camera settings)
// car movement handled directly y the car

// has the camera object

/*
black: i can use this functionality but i have not activate it
grey: i can't use the functionality
green: i have activated the functionality
*/
const colors = ["black", "grey", "green"];

class ControlPanel {
  // maybe main canvas isn't useful, use window
  constructor(controlCanvas, camera, car) {
    // only useful thing

    this.camera = camera;
    this.car = car;
    this.cubes = 0;

    this._activeListeners();

    this.ctx = controlCanvas.getContext("2d");
    this.title = "Flying car project";
    this.cubesText = "Cubes: 0";

    this.shortcuts = [
      { text: "W A S D: move the car", color: 0 },
      { text: "F: camera follows the car", color: 0 },
      { text: "R: rotate the camera with the car", color: 0 },
      { text: "Y: fly (active if car is stopped)", color: 0 },
    ];
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
          if (this.camera.followTarget) {
            this.camera.rotateWithTarget = !this.camera.rotateWithTarget;
          }
          break;

        case "y":
          if (this.car.isStopped()) this.car.fly = !this.car.fly;
          if (!this.car.fly) this.car.state.fluctuate = false;

          break;

        case "p":
          // this.camera.setFirstPerson(this.car.getFirstPerson());
          break;

        default:
          //   console.log(e.key + ": command not recognised");
          break;
      }
    });
  }

  addCube() {
    this.cubesText =
      ++this.cubes == 10 ? "Cubes: 10. YOU WIN!" : "Cubes: " + this.cubes;
  }

  // different if is on the phone or pc
  drawPanel() {
    // update colors
    this._updateColors();

    // Clear the 2D canvas
    let offset = 60; // on y

    this.ctx.clearRect(10, 10, this.ctx.canvas.width, this.ctx.canvas.height);
    // draw only if something has changed
    // if (changed){}

    // title
    this.ctx.font = "20px Arial";
    this.ctx.strokeText(this.title, 10, 30, 200);

    // shortcuts
    this.ctx.font = "17px Arial";
    this.ctx.fillStyle = "blue";
    this.ctx.fillText("SHORTCUTS:", 10, offset, 200);

    this.ctx.font = "15px Arial";
    this.shortcuts.forEach(({ text, color }) => {
      this.ctx.fillStyle = colors[color];
      offset += 20;
      this.ctx.fillText(text, 10, offset, 200);
    });

    // cubes
    this.ctx.font = "17px Arial";
    this.ctx.fillStyle = "blue";

    offset += 40;
    this.ctx.fillText(this.cubesText, 10, offset, 200);
  }

  _updateColors() {
    // f(ollow)
    this.shortcuts[1].color = this.camera.followTarget ? 2 : 0;

    // r(otate)
    this.shortcuts[2].color = this.camera.followTarget
      ? this.camera.rotateWithTarget
        ? 2
        : 0
      : 1;

    //(fl)y
    this.shortcuts[3].color = this.car.isStopped() ? (this.car.fly ? 2 : 0) : 1; // grey
  }
}

export { ControlPanel };
