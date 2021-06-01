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
      this.D * Math.cos(this.phi), // z
      this.D * Math.sin(this.phi) * Math.sin(this.theta), //y
    ];
  }

  // active listeners useful to handle the zoom and camera moving
  activeListeners(canvas) {
    let moveHandler = (event) => {
      let dr = degToRad(4);

      if (event.pageX !== this.lastPosition[0]) {
        // x
        event.pageX > this.lastPosition[0]
          ? (this.theta = thetaModule(this.theta + dr))
          : (this.theta = thetaModule(this.theta - dr));
      }
      if (event.pageY !== this.lastPosition[1]) {
        // y
        event.pageY < this.lastPosition[1]
          ? (this.phi = phiCheck(this.phi, dr))
          : (this.phi = phiCheck(this.phi, -dr));
      }

      // console.log(radToDeg(this.theta), radToDeg(this.phi));
      this.lastPosition = [event.pageX, event.pageY];
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

// phi have to be  0 < phi < pi
function phiCheck(phi, dr) {
  let newPhi = phi + dr;

  if (newPhi + dr >= 0 && newPhi <= Math.PI) {
    return newPhi;
  } else return phi;
  // return phi >= 0 ? phi % Math.PI : Math.PI * 2;
}

// theta have to be 0 < theta < 2 pi
function thetaModule(theta) {
  return theta % (Math.PI * 2);
}

export { Camera };
