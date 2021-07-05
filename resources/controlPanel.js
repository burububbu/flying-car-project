// not only the ontrol canvas but also the values to control (change the car, change the background, the ground, camera settings)
// car movement handled directly y the car

import { isMobileDevice } from "./utils.JS";

// has the camera object

/*
black: i can use this functionality but i have not activate it
grey: i can't use the functionality
green: i have activated the functionality
*/
const colors = ["black", "grey", "green"];

class ControlPanel {
  // maybe main canvas isn't useful, use window
  constructor(controlPanel, commands) {
    this.cubes = 0;
    this.bumpMapping = false;

    this.mobile = isMobileDevice();
    this.commands = commands;

    this.enabled = false;

    this.controlPanel = controlPanel;
  }

  initPanel(camera, car) {
    this.camera = camera;
    this.car = car;

    if (this.mobile) {
      this.initMobileVersion();
    } else this.initPCVersion();
  }

  initPCVersion() {
    this.ctx = this.controlPanel.getContext("2d");

    this.title = "Flying car project";
    this.cubesText = "Cubes: 0";

    this.shortcuts = [
      { text: "W A S D: move the car", color: 1 },
      { text: "F: camera follows the car", color: 1 },
      { text: "R: rotate the camera with the car", color: 1 },
      { text: "P: first person", color: 1 },
      { text: "Y: fly (active if car is stopped)", color: 1 },
    ];

    this.advancedSettings = [{ text: "M: active bump mapping", color: 1 }];
  }

  initMobileVersion() {}

  enablePanel() {
    this.enabled = true;

    this._activeCameraListeners();

    if (this.mobile) this._activeMobileListeners(this.commands);
    else this._activeListeners();
  }

  _activeMobileListeners() {
    // [
    //   "upCommand",
    //   "downCommand",
    //   "leftCommand",
    //   "rightCommand",

    //   "upLeftCommand",
    //   "upRightCommand",
    //   "downLeftCommand",
    //   "downRightCommand",

    //   "flyCommand",
    //   "firstPersonCommand",
    //   "cameraFollowCommand",
    //   "cameraRotateCommand",

    //   "zoomInCommand",
    //   "zoomOutCommand",
    // ]

    this.commands.slice(0, 4).forEach((command, ind) => {
      command.addEventListener("touchstart", () => (this.car.keys[ind] = true));
      command.addEventListener("touchend", () => (this.car.keys[ind] = false));
    });

    // add listenerd to commands up-left, up-right ...
    let updateTwoKeys = (commandInd, v1, v2) => {
      this.commands[commandInd].addEventListener("touchstart", () => {
        this.car.keys[v1] = true;
        this.car.keys[v2] = true;
      });

      this.commands[commandInd].addEventListener("touchend", () => {
        this.car.keys[v1] = false;
        this.car.keys[v2] = false;
      });
    };

    [
      [4, 0, 2],
      [5, 0, 3],
      [6, 1, 2],
      [7, 1, 3],
    ].forEach((indexes) => updateTwoKeys(...indexes));

    // add listeners for other commands
    this.commands[8].addEventListener("touchstart", () => {
      this._setFly();
    });

    this.commands[9].addEventListener("touchstart", () => {
      this._setFP();
    });

    this.commands[10].addEventListener("touchstart", () => {
      this._setFollow();
    });

    this.commands[11].addEventListener("touchstart", () => {
      this._setRotate();
    });

    this.commands[11].addEventListener("touchstart", () => {
      this._setRotate();
    });
  }

  _activeListeners() {
    // shortcuts
    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "f":
          this._setFollow();
          break;
        case "r":
          this._setRotate();
          break;
        case "y":
          this._setFly();
          break;
        case "p":
          this._setFP();
          break;
        case "m":
          this.bumpMapping = !this.bumpMapping;
          break;
        default:
          break;
      }
    });

    this.shortcuts[0].color = 0; // activare WASD

    // car handler
    window.addEventListener("keydown", (e) => {
      let ind = ["w", "s", "a", "d"].indexOf(e.key);

      if (ind > -1) this.car.keys[ind] = true;
    });

    window.addEventListener("keyup", (e) => {
      let ind = ["w", "s", "a", "d"].indexOf(e.key);
      if (ind > -1) this.car.keys[ind] = false;
    });
  }

  _activeCameraListeners() {
    let events = this.mobile
      ? ["touchstart", "touchmove", "touchend"]
      : ["mousedown", "mousemove", "mouseup"];

    // user hold down the mouse
    window.addEventListener(events[0], () => {
      if (!this.firstPerson) {
        // update current mouse position
        // this.lastPosition = [event.pageX, event.pageY];
        window.addEventListener(
          events[1],
          this.mobile
            ? this.camera.moveHandlerMobile
            : this.camera.moveHandlerPC
        );
      }
    });

    // user doesn't hold the mouse
    window.addEventListener(events[2], () => {
      if (!this.firstPerson)
        window.removeEventListener(
          events[1],
          this.mobile
            ? this.camera.moveHandlerMobile
            : this.camera.moveHandlerPC
        );
    });

    if (this.mobile) {
      this.commands[12].addEventListener(
        "touchstart",
        this.camera.zoomInHandlerMobile
      );
      this.commands[13].addEventListener(
        "touchstart",
        this.camera.zoomOutHandlerMobile
      );
    }
    // zoom in zoom out
    else window.addEventListener("wheel", this.camera.zoomHandlerPC);
  }

  _setFly() {
    if (this.car.isStopped()) this.car.fly = !this.car.fly;
    if (!this.car.fly) this.car.state.fluctuate = false;
  }

  _setFP() {
    this.camera.firstPerson = !this.camera.firstPerson;

    if (!this.camera.firstPerson) {
      this.camera.followTarget = !this.camera.followTarget;
      this.camera.rotateWithTarget = false;
    }
  }

  _setRotate() {
    if (this.camera.followTarget) {
      this.camera.rotateWithTarget = !this.camera.rotateWithTarget;
    }
  }

  _setFollow() {
    if (!this.camera.firstPerson) {
      this.camera.followTarget = !this.camera.followTarget;
      this.camera.rotateWithTarget = false;
    }
  }

  addCube() {
    this.cubesText =
      ++this.cubes == 10 ? "Cubes: 10. YOU WIN!" : "Cubes: " + this.cubes;
  }

  // different if is on the phone or pc
  drawPanel() {
    if (this.mobile) {
    } else {
      this.drawPCPanel();
    }
  }

  drawPCPanel() {
    // update colors
    if (this.enabled) this._updateColors();

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

    // advanced settings
    // shortcuts
    this.ctx.font = "17px Arial";
    this.ctx.fillStyle = "blue";

    offset += 30;
    this.ctx.fillText("Advanced settings:", 10, offset, 200);

    this.ctx.font = "15px Arial";
    1;
    this.advancedSettings.forEach(({ text, color }) => {
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
    if (this.camera.firstPerson) {
      this.shortcuts[1].color = 1;
      this.shortcuts[2].color = 1;

      this.shortcuts[3].color = 2;
    } else {
      // f(ollow)
      this.shortcuts[1].color = this.camera.followTarget ? 2 : 0;

      // r(otate)
      this.shortcuts[2].color = this.camera.followTarget
        ? this.camera.rotateWithTarget
          ? 2
          : 0
        : 1;
    }

    //(fl)y
    this.shortcuts[4].color = this.car.isStopped() ? (this.car.fly ? 2 : 0) : 1; // grey

    this.advancedSettings[0].color = this.bumpMapping ? 2 : 0;
  }
}

export { ControlPanel };
