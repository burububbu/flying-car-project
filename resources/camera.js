import { degToRad } from "./utils.js";

const rad360 = Math.PI * 2;
const dr = degToRad(4); // if odd then change phi condition with newPhi + dr > 0 && newPhi <= Math.PI

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
      this.D * Math.cos(this.phi), // y (technically this is the z formula but in this project we have the y axis as vertical axis and not the z axis as at lesson)
      this.D * Math.sin(this.phi) * Math.sin(this.theta), // z (technically this is the y formula)
    ];
  }

  // active listeners useful to handle the zoom and camera moving
  activeListeners(canvas) {
    let moveHandler = (event) => {
      // mouse movement on y axis
      if (event.pageX !== this.lastPosition[0]) {
        event.pageX > this.lastPosition[0] // % (rad360) because theta have to be between 0 and 2PI (here i check only the latter condition)
          ? (this.theta = this.theta + (dr % rad360))
          : (this.theta = this.theta - (dr % rad360));
      }

      // mouse movement on y axis
      if (event.pageY !== this.lastPosition[1]) {
        event.pageY < this.lastPosition[1]
          ? (this.phi = phiCheck(this.phi, dr))
          : (this.phi = phiCheck(this.phi, -dr));
      }

      this.lastPosition = [event.pageX, event.pageY];
    };

    // user hold down the mouse
    canvas.addEventListener("mousedown", (event) => {
      // update current mouse position
      this.lastPosition = [event.pageX, event.pageY];

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

// phi have to be  0 < phi < pi
function phiCheck(phi, dr) {
  let newPhi = phi + dr;

  if (newPhi + dr >= 0 && newPhi <= Math.PI) {
    return newPhi;
  } else return phi;
  // return phi >= 0 ? phi % Math.PI : Math.PI * 2;
}

export { Camera };
