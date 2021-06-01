import { degToRad } from "./utils.js";

// class that represent the camera
class Camera {
  constructor(D, theta, phi, up, target) {
    // spherical coords
    this.D = D;
    this.theta = theta;
    this.phi = phi;

    // view up vector
    this.up = up;

    // target
    this.target = target;

    // useful for camera moving
    this.lastPosition = undefined;
  }

  // get camera matrix
  getMatrix() {
    return m4.lookAt(this.getCartesianCoord(), this.target, this.up);
  }

  getCartesianCoord() {
    return [
      this.D * Math.sin(this.phi) * Math.cos(this.theta), //x
      this.D * Math.sin(this.phi) * Math.sin(this.theta), //y
      this.D * Math.cos(this.phi), // z
    ];
  }

  // active listeners useful to handle the zoom and camera moving
  activeListeners(canvas) {
    let moveHandler = (event) => {
      let dr = degToRad(2);

      if (event.pageX !== this.lastPosition[0]) {
        // x
        event.pageX < this.lastPosition[0]
          ? (this.phi += dr)
          : (this.phi -= dr);
      }
      if (event.pageY !== this.lastPosition[1]) {
        // x
        event.pageY > this.lastPosition[1]
          ? (this.theta += dr)
          : (this.theta -= dr);
      }

      this.lastPosition = [event.pageX, event.pageY];

      console.log("ao");
    };

    // user hold down the mouse
    canvas.addEventListener("mousedown", (event) => {
      // update current mouse position
      this.lastPosition = [event.pageX, event.pageY];
      let dr = (15.0 * Math.PI) / 180.0;
      this.theta += dr;

      canvas.addEventListener("mousemove", moveHandler);
    });

    // user doesn't hold the mouse
    canvas.addEventListener("mouseup", () =>
      canvas.removeEventListener("mousemove", moveHandler)
    );

    // zoom in zoom out
    canvas.addEventListener("wheel", (event) => {
      this.D += event.deltaY * -0.1;
    });
  }
}

export { Camera };
