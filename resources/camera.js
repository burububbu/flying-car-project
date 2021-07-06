import { degToRad, phiCheck } from "./utils.js";

const rad360 = Math.PI * 2;
const dr = degToRad(1.5);
class Camera {
  constructor(D, theta, phi, up, target) {
    // camera spherical coords
    this.D = D;
    this.theta = theta;
    this.phi = phi;

    // view up vector
    this.up = up;

    this.cartesianCoord = [0, 0, 0];

    // useful for camera moving
    this.lastPosition = [0, 0, 0];

    // target position (cartesian coord)
    this.target = target;

    // target position (spherical coord), used when camera is set to first person
    this.targetPhi = degToRad(90);
    this.targetTheta = degToRad(1);
    this.targetD = 20;

    // handled by control panel
    this.followTarget = false;
    this.rotateWithTarget = false;
    this.firstPerson = false;

    // update coords
    this._updateCartesianCoord();

    // set camera events handler
    this.setHandlers();
  }

  setFirstPerson(cameraPos, rotation) {
    this.cartesianCoord = cameraPos;

    // use spherical coordinates for the target (the system center is the camera position)
    this.targetTheta = degToRad(rotation);
    this.target = this._getCartCoord(
      this.targetPhi,
      this.targetTheta,
      this.targetD,
      this.cartesianCoord
    );
  }

  _getCartCoord(phi, theta, D, origin) {
    return [
      D * Math.sin(phi) * Math.sin(theta) + origin[0], // x (old y)
      D * Math.cos(phi) + origin[1], // y (old z)
      D * Math.sin(phi) * Math.cos(theta) + origin[2], // z (old x)
    ];
  }

  getMatrix() {
    return m4.lookAt(this.cartesianCoord, this.target, this.up);
  }

  updateTarget(target, rotation) {
    // update target and rotate of the camera if requested
    this.target = target;
    if (this.rotateWithTarget) this.theta = degToRad(rotation);
    this._updateCartesianCoord();
  }

  _updateCartesianCoord() {
    return (this.cartesianCoord = this._getCartCoord(
      this.phi,
      this.theta,
      this.D,
      this.target
    ));
  }

  addPhi(inc) {
    this.phi += inc;
    this._updateCartesianCoord();
  }
  addTheta(inc) {
    this.theta += inc;
    this._updateCartesianCoord();
  }
  addD(inc) {
    this.D += inc;
    this._updateCartesianCoord();
  }

  // described here but activated in controlPanel instance
  setHandlers() {
    this.moveHandlerPC = (event) => {
      if (!this.firstPerson) {
        // mouse movement on x axis
        if (!this.rotateWithTarget && event.pageX !== this.lastPosition[0]) {
          event.pageX > this.lastPosition[0] // % (rad360) because theta have to be between 0 and 2PI (here i check only the latter condition)
            ? (this.theta = this.theta + (dr % rad360))
            : (this.theta = this.theta - (dr % rad360));
        }

        if (event.pageY !== this.lastPosition[1]) {
          // mouse movement on y axis
          event.pageY < this.lastPosition[1]
            ? (this.phi = phiCheck(this.phi, dr))
            : (this.phi = phiCheck(this.phi, -dr));
        }
        this._updateCartesianCoord();

        this.lastPosition = [event.pageX, event.pageY];
      }
    };

    this.moveHandlerMobile = (event) => {
      if (!this.firstPerson) {
        // mouse movement on x axis
        let touch = event.touches[0];

        if (!this.rotateWithTarget && touch.pageX !== this.lastPosition[0]) {
          touch.pageX > this.lastPosition[0]
            ? (this.theta = this.theta + (dr % rad360))
            : (this.theta = this.theta - (dr % rad360));
        }

        if (touch.pageY !== this.lastPosition[1]) {
          // mouse movement on y axis
          touch.pageY < this.lastPosition[1]
            ? (this.phi = phiCheck(this.phi, dr))
            : (this.phi = phiCheck(this.phi, -dr));
        }
        this._updateCartesianCoord();

        this.lastPosition = [touch.pageX, touch.pageY];
      }
    };

    this.zoomHandlerPC = (event) => {
      if (!this.firstPerson)
        if (this.D > 5 || event.deltaY < 0) this.D += event.deltaY * -0.008;
      this._updateCartesianCoord();
    };

    this.zoomInHandlerMobile = (e) => {
      if (!this.firstPerson && this.D > 5) this.D -= 1;
      this._updateCartesianCoord();
    };

    this.zoomOutHandlerMobile = (e) => {
      if (!this.firstPerson && this.D > 5) this.D += 1;
      this._updateCartesianCoord();
    };
  }
}

export { Camera };
