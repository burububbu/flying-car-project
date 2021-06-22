import { degToRad } from "./utils.js";

const rad360 = Math.PI * 2;
const dr = degToRad(1.5); // if odd then change phi condition with newPhi + dr > 0 && newPhi <= Math.PI

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

    this.cartesianCoord = [0, 0, 0];
    this.updateCartesianCoord();

    // useful for camera moving
    this.lastPosition = [0, 0, 0];
  }

  // get camera matrix
  getMatrix() {
    return m4.lookAt(this.cartesianCoord, this.target, this.up);
  }

  updateCartesianCoord() {
    // x = old y
    // y = old z
    // z = old x

    this.cartesianCoord[0] = this.D * Math.sin(this.phi) * Math.sin(this.theta); // x (old y)
    this.cartesianCoord[1] = this.D * Math.cos(this.phi); // y (old z)
    this.cartesianCoord[2] = this.D * Math.sin(this.phi) * Math.cos(this.theta); // z (old x)
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
      this.updateCartesianCoord();

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
      if (this.D > 10 || event.deltaY < 0) this.D += event.deltaY * -0.01; // in this way
      this.updateCartesianCoord();
    });
  }
}

// phi have to be  0 < phi < pi
function phiCheck(phi, dr) {
  let newPhi = phi + dr;

  // maybe reset to if (newPhi + dr >= 0 && newPhi <= Math.PI)
  if (newPhi + dr >= degToRad(30) && newPhi <= Math.PI / 2 - degToRad(3)) {
    return newPhi;
  } else return phi;
}

export { Camera };

// canvas.addEventListener("touchstart", (event) => {
//   // update current mouse position
//   this.lastPosition = [event.pageX, event.pageY];

//   canvas.addEventListener("touchmove", moveHandler);
// });

// canvas.addEventListener("touchend", () =>
//   canvas.removeEventListener("touchmove", moveHandler)
// );
