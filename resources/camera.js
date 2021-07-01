import { degToRad } from "./utils.js";

const rad360 = Math.PI * 2;
const dr = degToRad(1.5); // if odd then change phi condition with newPhi + dr > 0 && newPhi <= Math.PI
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
    this._updateCartesianCoord();

    // useful for camera moving
    this.lastPosition = [0, 0, 0];

    // handled by control panel
    this.followTarget = true;
    this.rotateWithTarget = true;

    this._activeListeners();
  }

  // get camera matrix
  getMatrix() {
    return m4.lookAt(this.cartesianCoord, this.target, this.up);
  }

  update(target, rotation) {
    // update target and rotation of the camera if requested
    this.target = target;
    if (this.rotateWithTarget) this.theta = degToRad(rotation);
    this._updateCartesianCoord();
  }

  _updateCartesianCoord() {
    this.cartesianCoord[0] =
      this.D * Math.sin(this.phi) * Math.sin(this.theta) + this.target[0]; // x (old y)
    this.cartesianCoord[1] = this.D * Math.cos(this.phi) + this.target[1]; // y (old z)
    this.cartesianCoord[2] =
      this.D * Math.sin(this.phi) * Math.cos(this.theta) + this.target[2]; // z (old x)
  }

  // active listeners useful to handle the zoom and camera moving
  _activeListeners() {
    let moveHandler = (event) => {
      // mouse movement on x axis
      if (!this.rotateWithTarget && event.pageX !== this.lastPosition[0]) {
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
      this._updateCartesianCoord();

      this.lastPosition = [event.pageX, event.pageY];
    };

    // user hold down the mouse
    window.addEventListener("mousedown", (event) => {
      // update current mouse position
      this.lastPosition = [event.pageX, event.pageY];
      window.addEventListener("mousemove", moveHandler);
    });

    // user doesn't hold the mouse
    window.addEventListener("mouseup", () =>
      window.removeEventListener("mousemove", moveHandler)
    );

    // zoom in zoom out
    window.addEventListener("wheel", (event) => {
      if (this.D > 5 || event.deltaY < 0) this.D += event.deltaY * -0.01; // in this way
      this._updateCartesianCoord();
    });
  }
}

// phi have to be  0 < phi < pi
function phiCheck(phi, dr) {
  let newPhi = phi + dr;
  return newPhi + dr >= degToRad(30) && newPhi <= Math.PI / 2 - degToRad(5)
    ? newPhi
    : phi;
}

export { Camera };
