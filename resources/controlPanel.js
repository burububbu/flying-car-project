import { isMobileDevice } from "./utils.JS";

const colors = ["black", "grey", "green"];

const commandNames = [
  "upCommand",
  "downCommand",
  "leftCommand",
  "rightCommand",

  "upLeftCommand",
  "upRightCommand",
  "downLeftCommand",
  "downRightCommand",

  "flyCommand",
  "firstPersonCommand",
  "cameraFollowCommand",
  "cameraRotateCommand",

  "zoomInCommand",
  "zoomOutCommand",
  "bumpMappingCommand",
];

class ControlPanel {
  constructor(camera, car, lightPosition) {
    this.cubes = 0;
    this.bumpMapping = false;
    this.enabled = false;

    this.offset = 60;

    this.mobile = isMobileDevice();

    this.camera = camera;
    this.car = car;

    this.defaultPosition = [...lightPosition]; // shallow copy
    this.lightPosition = lightPosition;

    // set main canvas, commands (mobile version) or control canvas (pc version)
    this.mainCanvas = document.getElementById("canvas");

    if (this.mobile) {
      this.commands = commandNames.map((command) =>
        document.getElementById(command)
      );
    } else {
      let controlPanelPC = document.getElementById("controlPanelPC");
      this.ctx = controlPanelPC.getContext("2d");

      this.initPCVersion();
    }
  }

  // init values to draw on the canvas
  initPCVersion() {
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

  enablePanel() {
    this.enabled = true;

    this._activeCameraListeners();
    this._activeLightListeners();

    if (this.mobile) this._activeMobileListeners(this.commands);
    else this._activePCListeners();
  }

  _activeLightListeners() {
    let sliders = ["xLightSlider", "yLightSlider", "zLightSlider"].map((name) =>
      document.getElementById(name)
    );

    sliders.forEach((slider, idx) => {
      slider.disabled = false;
      slider.addEventListener("input", () => {
        this.lightPosition[idx] = Number(slider.value);
      });
    });

    document.getElementById("resetLight").addEventListener("click", () => {
      sliders.forEach(
        (slider, idx) => (slider.value = this.defaultPosition[idx])
      );
      this.lightPosition = [...this.defaultPosition];
    });
  }
  _activeMobileListeners() {
    // w s a d commands
    this.commands.slice(0, 4).forEach((command, ind) => {
      command.addEventListener("touchstart", () => (this.car.keys[ind] = true));
      command.addEventListener("touchend", () => (this.car.keys[ind] = false));
    });

    // up-left, u-right, down-left, down-right commands. ----
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
    // -------

    // other commands
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
      this._setRotate(); // rotate camera with the target
    });

    this.commands[14].addEventListener("touchstart", () => {
      this.bumpMapping = !this.bumpMapping; // enable/disable bump mapping
    });
  }

  _activePCListeners() {
    //handle shortcuts
    window.addEventListener("keydown", (e) => {
      switch (e.key.toLowerCase()) {
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
          this.bumpMapping = !this.bumpMapping; // enable/disable bump mapping
          break;
        default:
          break;
      }
    });

    // car movement handler
    window.addEventListener("keydown", (e) => {
      let ind = ["w", "s", "a", "d"].indexOf(e.key.toLowerCase());

      if (ind > -1) this.car.keys[ind] = true;
    });

    window.addEventListener("keyup", (e) => {
      let ind = ["w", "s", "a", "d"].indexOf(e.key.toLowerCase());
      if (ind > -1) this.car.keys[ind] = false;
    });
  }

  _activeCameraListeners() {
    let events = this.mobile
      ? ["touchstart", "touchmove", "touchend"]
      : ["mousedown", "mousemove", "mouseup"];

    // user holds down the mouse / starts to touch the screen
    this.mainCanvas.addEventListener(events[0], () => {
      if (!this.firstPerson) {
        // update current mouse position
        this.mainCanvas.addEventListener(
          events[1],
          this.mobile
            ? this.camera.moveHandlerMobile
            : this.camera.moveHandlerPC
        );
      }
    });

    // user holds down the mouse anymore / ends to touch the screen
    this.mainCanvas.addEventListener(events[2], () => {
      if (!this.firstPerson)
        this.mainCanvas.removeEventListener(
          events[1],
          this.mobile
            ? this.camera.moveHandlerMobile
            : this.camera.moveHandlerPC
        );
    });

    // handle zoom in/ out  with two buttons mobile version) or with wheel (pc version)
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

  // a series of setters shared by pc and mobile commands
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

  // draw panel only for pc version
  drawPanel() {
    if (!this.mobile) this._drawPCPanel();
  }

  _drawPCPanel() {
    // update colors
    if (this.enabled) this._updateColors();

    // Clear the 2D canvas
    this.ctx.clearRect(10, 10, this.ctx.canvas.width, this.ctx.canvas.height);

    this.ctx.font = "20px Arial";
    this.ctx.strokeText(this.title, 10, 30, 200);

    this._drawSections("SHORTCUTS", this.shortcuts);
    this._drawSections("ADVANCED SETTINGS", this.advancedSettings);

    this.ctx.font = "17px Arial";
    this.ctx.fillStyle = "blue";
    this.ctx.fillText(this.cubesText, 10, this.offset, 200);

    // reset offset
    this.offset = 60;
  }

  _drawSections(title, sections) {
    this.ctx.font = "17px Arial";
    this.ctx.fillStyle = "blue";
    this.ctx.fillText(title, 10, this.offset, 200);

    this.ctx.font = "15px Arial";

    sections.forEach(({ text, color }) => {
      this.ctx.fillStyle = colors[color];
      this.offset += 20;
      this.ctx.fillText(text, 10, this.offset, 200);
    });

    this.offset += 30;
  }

  _updateColors() {
    this.shortcuts[0].color = 0;

    if (this.camera.firstPerson) {
      this.shortcuts[3].color = 2;

      this.shortcuts[1].color = 1;
      this.shortcuts[2].color = 1;
    } else {
      this.shortcuts[3].color = 0;

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

    // bump mapping
    this.advancedSettings[0].color = this.bumpMapping ? 2 : 0;
  }
}

export { ControlPanel };
