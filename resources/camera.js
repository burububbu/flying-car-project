import { degToRad, isMobileDevice, phiCheck } from "./utils.js";

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
    this.followTarget = false;
    this.rotateWithTarget = false;
    this.firstPerson = false;

    this.targetPhi = degToRad(90);
    this.targetTheta = degToRad(1);
    this.targetD = 20;

    // set camera events handler
    this.setHandlers();
  }

  // work with cartesian coordinates
  setFirstPerson(firstCoor, rotation) {
    // use spherical coordinates for the target
    this.cartesianCoord = firstCoor;
    this.targetTheta = degToRad(rotation);
    this.target = this.getTargetFirstPerson();
  }

  getTargetFirstPerson() {
    return this._getCartCoord(
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

  // get camera matrix
  getMatrix() {
    return m4.lookAt(this.cartesianCoord, this.target, this.up);
  }

  updateTarget(target, rotation) {
    // update target and rotation of the camera if requested
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

  setHandlers() {
    this.moveHandlerPC = (event) => {
      if (!this.firstPerson) {
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
      }
    };

    this.moveHandlerMobile = (event) => {
      if (!this.firstPerson) {
        // mouse movement on x axis
        let touch = event.touches[0];

        if (!this.rotateWithTarget && touch.pageX !== this.lastPosition[0]) {
          touch.pageX > this.lastPosition[0] // % (rad360) because theta have to be between 0 and 2PI (here i check only the latter condition)
            ? (this.theta = this.theta + (dr % rad360))
            : (this.theta = this.theta - (dr % rad360));
        }

        // mouse movement on y axis
        if (touch.pageY !== this.lastPosition[1]) {
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
  }
}

export { Camera };
