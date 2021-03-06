/**
 * Circuit:
 *     Top-level class for defining a Circuit. An array of components, and nodes are managed by a central
 *     solver that updates and recalculates the conductance matrix every frame.
 *
 * @author Anthony Erlinger
 * @date 2011-2013
 *
 * Uses the Observer Design Pattern:
 *   Observes: <none>
 *   Observed By: Solver, Render
 *
 *
 * Event Message Passing interface:
 *   ON_UPDATE
 *   ON_PAUSE
 *   ON_RESUME
 *
 *   ON_ADD_COMPONENT
 *   ON_REMOVE_COMPONENT
 *
 */

let Logger = require('../io/Logger');
let SimulationParams = require('./SimulationParams');
let SimulationFrame = require('./SimulationFrame');
let CircuitSolver = require('../engine/CircuitSolver');
let Observer = require('../util/Observer');
let Rectangle = require('../geom/Rectangle');
let Util = require('../util/Util');

class Circuit extends Observer {
  static initClass() {
    this.DEBUG = false;

    // Messages Dispatched to listeners:

    this.ON_START_UPDATE = "ON_START_UPDATE";
    this.ON_COMPLETE_UPDATE = "ON_END_UPDATE";

    this.ON_RESET = "ON_RESET";

    this.ON_SOLDER = "ON_SOLDER";
    this.ON_DESOLDER = "ON_DESOLDER";

    this.ON_ADD_COMPONENT = "ON_ADD_COMPONENT";
    this.ON_REMOVE_COMPONENT = "ON_MOVE_COMPONENT";
    this.ON_MOVE_COMPONENT = "ON_MOVE_COMPONENT";

    this.ON_ERROR = "ON_ERROR";
    this.ON_WARNING = "ON_WARNING";

    this.hintMap = {
      1: "HINT_LC",
      2: "HINT_RC",
      3: "HINT_3DB_C",
      4: "HINT_TWINT",
      5: "HINT_3DB_L"
    }
  }

  constructor(name = "untitled") {
    super();

    this.name = name;
    this.Params = new SimulationParams();

    this.hintType = null;
    this.hintItem1 = null;
    this.hintItem2 = null;

    this.flags = 0;
    this.isStopped = false;

    this.grid_size = 8;

    this.clearAndReset();
  }

  copy() {
    let copyCircuit = new Circuit();

    copyCircuit.name = this.name;
    copyCircuit.Params = Object.assign({}, this.Params);

    copyCircuit.flags = this.flags;
    copyCircuit.isStopped = this.isStopped;
    copyCircuit.hintItem1 = this.hintItem1 && this.hintItem1;
    copyCircuit.hintItem2 = this.hintItem2 && this.hintItem2;

    for (let component of this.elementList) {
      copyCircuit.elementList.push(component.copy())
    }

    return copyCircuit
  }

  /**
   * Removes all circuit elements and scopes from the workspace and resets time to zero.
   *
   * Called on initialization and reset.
   */
  clearAndReset() {
    for (let element of Array.from((this.elementList != null))) {
      element.destroy();
    }

    this.Solver = new CircuitSolver(this);
    this.boundingBox = null;

    this.nodeList = [];
    this.elementList = [];
    this.voltageSources = [];

    this.scopes = [];

    this.time = 0;
    this.iterations = 0;
    this.lastFrameTime = 0;

    this.clearErrors();
    return this.notifyObservers(this.ON_RESET);
  }

  /**
   * "Solders" a new element to this circuit (adds it to the element list array).
   */
  solder(newElement) {
    if (Array.from(this.elementList).includes(newElement)) {
      this.halt(`Circuit component ${newElement} is already in element list`);
    }

    this.notifyObservers(this.ON_SOLDER);

    newElement.Circuit = this;
    // newElement.setPoints(newElement.x1, newElement.y1, newElement.x2, newElement.y2);
    //newElement.recomputeBounds();

    this.elementList.push(newElement);

    newElement.onSolder(this);

    this.invalidate();
    this.recomputeBounds();
  }

  /**
   * "Desolders" an existing element to this circuit (removes it to the element list array).
   */
  desolder(component) {
    this.notifyObservers(this.ON_DESOLDER);

    component.Circuit = null;
    Util.removeFromArray(this.elementList, component);

    // TODO: REMOVE NODES

    for (let nodeIdx of component.nodes) {
      let node = this.getNode(nodeIdx);

      if (!node)
        console.warn(`Error deleting nodes for ${component} No node found at ${nodeIdx}!`);

      if (node && node.getNeighboringElements() == [this]) {
        console.log("Orphaned node: ", nodeIdx)
      }
    }

    this.invalidate();
    this.recomputeBounds();
  }

  getGridSize() {
    return this.grid_size;
  }

  snapGrid(x) {
    return this.grid_size * Math.round(x / this.grid_size);
  }

  debugModeEnabled() {
    return Circuit.DEBUG || this.Params.debug;
  }

  toString() {
    let str = "";

    str += `Name: ${this.name}\n`;
    str += `Linear: ${!this.Solver.circuitNonLinear}\n`;
    str += `VS Count: ${this.voltageSourceCount}\n`;
    str += `Params:\n ${this.Params}\n`;
    str += `Frame #: ${this.getIterationCount()}\n`;

    // Elements
    str += `Elements: (${this.getElements().length})\n `;
    for (let element of this.getElements()) {
      str += "  " + element + "\n";
    }

    str += `Nodes: (${this.numNodes()})\n`;
    for (let node of this.getNodes()) {
      str += "  " + node + "\n";
    }

    // RowInfo
    str += `RowInfo: (${this.getRowInfo().length})\n`;
    for (let rowInfo of this.getRowInfo())
      str += "  " + rowInfo + "\n";

    str += "Circuit Matrix:\n";
    // str += this.Solver.dumpFrame() + "\n";

    // str += "Orig Matrix:\n";
    // str += this.Solver.dumpOrigFrame() + "\n";

    return str;
  }

  inspect() {
    return this.elementList.map(elm => elm.inspect());
  }

  invalidate() {
    return this.Solver.analyzeFlag = true;
  }

  dump() {
    let out = "";

    for (let elm of Array.from(this.getElements())) {
      out += elm.dump() + "\n";
    }

    return out;
  }

  getVoltageForNode(nodeIdx) {
    if (this.nodeList[nodeIdx].links[0]) {
      return this.nodeList[nodeIdx].links[0].elm.getVoltageForNode(nodeIdx);
    }
  }

  //###################################################################################################################
  /* Simulation Frame Computation
   *///################################################################################################################

  /**
   UpdateCircuit: Updates the circuit each frame.
   1. ) Reconstruct Circuit:
   Rebuilds a data representation of the circuit (only applied when circuit changes)
   2. ) Solve Circuit build matrix representation of the circuit solve for the voltage and current for each component.
   Solving is performed via LU factorization.
   */
  updateCircuit() {

    if (this.isStopped) {
      this.Solver.lastTime = 0;
    } else {
      this.frameStartTime = Date.now();

      this.notifyObservers(this.ON_START_UPDATE);
      this.Solver.reconstruct();
      this.Solver.solveCircuit();
      this.notifyObservers(this.ON_COMPLETE_UPDATE);

      for (let scope of this.scopes) {
        if (scope.circuitElm) {
          // console.log(scope.circuitElm.getVoltageDiff());
          // scope.sampleVoltage(this.time, scope.circuitElm.getVoltageDiff());
          // scope.sampleCurrent(this.time, scope.circuitElm.getCurrent());
          scope.redraw()
        }
      }

      this.frameEndTime = Date.now();

      this.lastFrameTime = this.frameEndTime - this.frameStartTime;

      // console.log(this.Solver.circuitMatrix);
      // console.log(this.Solver.circuitRightSide);
      // console.log(this.Solver.circuitRowInfo);
    }

//    @write(@Solver.dumpFrame() + "\n")
//    @write(@dump() + "\n")
  }

  warn(message) {
    Logger.warn(message);
    return this.warnMessage = message;
  }

  halt(message) {
    let e = new Error(message);

    console.warn(e.stack);
    Logger.error(message);

    return this.stopMessage = message;
  }

  clearErrors() {
    this.stopMessage = null;
    return this.stopElm = null;
  }


  //#####################################################N##############################################################
  /* Circuit Element Accessors:
   *///################################################################################################################

  getIterationCount() {
    return this.Solver.iterations;
  }

  getScopes() {
    return this.scopes;
  }

  getElements() {
    return this.elementList;
  }

  getElmByIdx(elmIdx) {
    return this.elementList[elmIdx];
  }

  numElements() {
    return this.elementList.length;
  }

  getVoltageSources() {
    return this.voltageSources;
  }

  recomputeBounds() {
    let minX = 10000000000;
    let minY = 10000000000;
    let maxX = -10000000000;
    let maxY = -10000000000;

    this.eachComponent(function (component) {
      let componentBounds = component.boundingBox;

      let componentMinX = componentBounds.x;
      let componentMinY = componentBounds.y;
      let componentMaxX = componentBounds.x + componentBounds.width;
      let componentMaxY = componentBounds.y + componentBounds.height;

      if (componentMinX < minX) {
        minX = componentMinX;
      }

      if (componentMinY < minY) {
        minY = componentMinY;
      }

      if (componentMaxX > maxX) {
        maxX = componentMaxX;
      }

      if (componentMaxY > maxY) {
        maxY = componentMaxY;
      }
    });

    return this.boundingBox = new Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  getBoundingBox() {
    return this.boundingBox;
  }

  resetNodes() {
    return this.nodeList = [];
  }

  addScope(scope) {
    scope.setCircuit(this);

    this.scopes.push(scope);
  }

  addCircuitNode(circuitNode) {
    return this.nodeList.push(circuitNode);
  }

  getNode(idx) {
    return this.nodeList[idx];
  }

  getNodeAtCoordinates(x, y) {
    for (let node of Array.from(this.nodeList)) {
      if ((node.x === x) && (node.y === y))
        return node;
    }
  }

  getNodes() {
    return this.nodeList;
  }

  getRowInfo() {
    return this.Solver.circuitRowInfo;
  }

  numNodes() {
    return this.nodeList.length;
  }

  findBadNodes() {
    this.badNodes = [];

    for (let circuitNode of Array.from(this.nodeList)) {
      if (!circuitNode.intern && (circuitNode.links.length === 1)) {
        let numBadPoints = 0;
        let firstCircuitNode = circuitNode.links[0];
        for (let circuitElm of Array.from(this.elementList)) {
          // If firstCircuitNode isn't the same as the second
          if ((firstCircuitNode.elm.equalTo(circuitElm) === false) && circuitElm.boundingBox.contains(circuitNode.x,
                  circuitNode.y)) {
            numBadPoints++;
          }
        }
        if (numBadPoints > 0) {
          // Todo: outline bad nodes here
          this.badNodes.push(circuitNode);
        }
      }
    }

    return this.badNodes;
  }

  destroy(components) {
    for (let component of components) {
      for (let circuitComponent of Array.from(this.getElements())) {
        if (circuitComponent.equalTo(component))
          this.desolder(circuitComponent, true);
      }
    }
  }

  pause() {
    this.isStopped = true;
  }

  resume() {
    this.isStopped = false;
  }

  subIterations() {
    return this.Solver.subIterations;
  }

  eachComponent(callback) {
    return Array.from(this.elementList).map((component) =>
        callback(component));
  }

  timeStep() {
    return this.Params.timeStep;
  }

  getTime() {
    return this.time;
  }

  voltageRange() {
    return this.Params.voltageRange;
  }

  powerRange() {
    return this.Params.powerRange;
  }

  currentSpeed() {
    return this.Params.currentSpeed;
  }

  simSpeed() {
    return this.Params.simSpeed;
  }

  updateSimSpeed(simSpeed) {
    this.Params.simSpeed = simSpeed;
  }

  getState() {
    return this.state;
  }

  getStamper() {
    return this.Solver.getStamper();
  }

  setHint(type, item1, item2) {
    if (typeof type == "string") {
      if (parseInt(type)) {
        this.hintType = Circuit.hintMap[parseInt(type)];
      } else {
        this.hintType = type;
      }
    } else {
      this.hintType = Circuit.hintMap[parseInt(type)];
    }

    this.hintItem1 = parseInt(item1);
    this.hintItem2 = parseInt(item2);
  }

  serialize() {
    let hint;

    if (this.hintType) {
      hint = {
        name: "Hint",
        hintType: this.hintType,
        hintItem1: this.hintItem1,
        hintItem2: this.hintItem2
      }
    }

    let circuitObj = {
      params: {
        type: this.Params.name,
        timeStep: this.timeStep(),
        simSpeed: this.simSpeed(),
        currentSpeed: this.currentSpeed(),
        voltageRange: this.voltageRange(),
        powerRange: this.powerRange(),
        flags: this.flags
      },
      components: this.elementList.map(element => element.serialize())
    };

    return circuitObj
  }

  toJson() {
    return {
      startCircuit: this.Params.name,
      timeStep: this.timeStep(),
      flags: this.flags,
      circuitNonLinear: this.Solver.circuitNonLinear,
      voltageSourceCount: this.voltageSourceCount,
      circuitMatrixSize: this.Solver.circuitMatrixSize,
      circuitMatrixFullSize: this.Solver.circuitMatrixFullSize,
      circuitPermute: this.Solver.circuitPermute,
      voltageSources: this.getVoltageSources().map(elm => elm.toJson()),
      circuitRowInfo: this.Solver.circuitRowInfo.map(rowInfo => rowInfo.toJson()),
      elmList: this.elementList.map(element => element.toJson()),
      nodeList: this.nodeList.map(node => node.toJson())
    };
  }

  frameJson() {
    return {
      nFrames: this.iterations,
      t: this.time,
      circuitMatrix: this.Solver.circuitMatrix,
      circuitRightSide: this.Solver.circuitRightSide,
      simulationFrames: this.Solver.simulationFrames.map(element => element.toJson())
    };
  }

  /*
   dumpFrameJson(filename) {
   let circuitFramsJson;
   if (filename == null) {
   filename = `./dump/${this.Params.name}_FRAMES.json`;
   }
   circuitFramsJson = JSON.stringify(this.frameJson(), null, 2);

   return fs.writeFileSync(filename, circuitFramsJson)
   }

   dumpAnalysisJson() {
   let circuitAnalysisJson = JSON.stringify(this.toJson(), null, 2);

   return fs.writeFileSync("./dump/#{@Params.name}_ANALYSIS.json", circuitAnalysisJson)
   }
   */
}

Circuit.initClass();

module.exports = Circuit;
