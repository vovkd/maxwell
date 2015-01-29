;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0](function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
(function(global){(function() {
  var Circuit, CircuitCanvas, CircuitLoader, Maxwell;

  CircuitLoader = require('./io/CircuitLoader.coffee');

  Circuit = require('./circuit/circuit.coffee');

  CircuitCanvas = require('./render/circuitCanvas.coffee');

  Maxwell = (function() {
    Maxwell.Circuits = {};

    function Maxwell(canvas, options) {
      var _this = this;
      if (options == null) {
        options = {};
      }
      this.Circuit = null;
      this.circuitName = options['circuitName'];
      if (this.circuitName) {
        CircuitLoader.createCircuitFromJsonFile(this.circuitName, function(circuit) {
          _this.Circuit = circuit;
          return new CircuitCanvas(_this.Circuit, canvas);
        });
      }
    }

    Maxwell._loadCircuitFromFile = function(circuitFileName) {
      return CircuitLoader.createCircuitFromJsonFile(circuitFileName);
    };

    Maxwell._loadCircuitFromJson = function(jsonData) {
      return CircuitLoader.createCircuitFromJsonData(jsonData);
    };

    Maxwell.createCircuit = function(circuitName, circuitData) {
      var circuit;
      circuit = null;
      if (circuitData) {
        if (typeof circuitData === "string") {
          circuit = Maxwell._loadCircuitFromFile(circuitData);
        } else if (typeof circuitData === "object") {
          circuit = Maxwell._loadCircuitFromJson(circuitData);
        } else {
          raise("Parameter must either be a path to a JSON file or raw JSON data representing the circuit.\nUse `Maxwell.createCircuit()` to create a new empty circuit object.");
        }
      } else {
        circuit = new Circuit();
      }
      this.Circuits[circuitName] = circuit;
      return circuit;
    };

    Maxwell.foo = function() {
      return "foo";
    };

    Maxwell.prototype.instance_method = function() {
      return "instance";
    };

    return Maxwell;

  })();

  if (typeof window === "undefined") {
    console.log("Not in browsier, including maxwell...");
    global.Maxwell = Maxwell;
  } else {
    window.Maxwell = Maxwell;
  }

  module.exports = Maxwell;

}).call(this);


})(window)
},{"./io/CircuitLoader.coffee":2,"./circuit/circuit.coffee":3,"./render/circuitCanvas.coffee":4}],2:[function(require,module,exports){
(function() {
  var Circuit, CircuitLoader, ComponentRegistry, Hint, Oscilloscope, SimulationParams;

  ComponentRegistry = require('../circuit/ComponentRegistry.coffee');

  SimulationParams = require('../core/SimulationParams.coffee');

  Circuit = require('../circuit/Circuit.coffee');

  Oscilloscope = require('../scope/Oscilloscope.coffee');

  Hint = require('../engine/Hint.coffee');

  CircuitLoader = (function() {
    function CircuitLoader() {}

    CircuitLoader.createCircuitFromJsonData = function(jsonData) {
      var circuit, circuitParams, elementData, elms, flags, newCircuitElm, params, sym, type, x1, x2, y1, y2, _i, _len;
      circuit = new Circuit();
      circuitParams = jsonData.shift();
      circuit.Params = new SimulationParams(jsonData);
      console.log(circuit.Params.toString());
      console.log("- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -");
      console.log("Soldering Components:");
      console.log("- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -");
      elms = [];
      for (_i = 0, _len = jsonData.length; _i < _len; _i++) {
        elementData = jsonData[_i];
        type = elementData['sym'];
        sym = ComponentRegistry.ComponentDefs[type];
        x1 = parseInt(elementData['x1']);
        y1 = parseInt(elementData['y1']);
        x2 = parseInt(elementData['x2']);
        y2 = parseInt(elementData['y2']);
        flags = parseInt(elementData['flags']);
        params = elementData['params'];
        if (sym === null) {
          circuit.halt("Element: " + (JSON.stringify(elementData)) + " is null");
        }
        if (type === Hint) {
          console.log("Hint found in file!");
        }
        if (type === Oscilloscope) {
          console.log("Scope found in file!");
        }
        if (!type) {
          circuit.warn("Unrecognized Type");
        }
        if (!sym) {
          circuit.warn("Unrecognized dump type: " + type);
        } else {
          newCircuitElm = new sym(x1, y1, x2, y2, flags, params);
          elms.push(newCircuitElm);
          circuit.solder(newCircuitElm);
        }
      }
      if (elms.length === 0) {
        console.error("No elements loaded. JSON most likely malformed");
      }
      return circuit;
    };

    /*
    Retrieves string data from a circuit text file (via AJAX GET)
    */


    CircuitLoader.createCircuitFromJsonFile = function(circuitFileName, onComplete) {
      if (onComplete == null) {
        onComplete = null;
      }
      return $.getJSON(circuitFileName, function(jsonData) {
        var circuit;
        circuit = CircuitLoader.createCircuitFromJsonData(jsonData);
        return typeof onComplete === "function" ? onComplete(circuit) : void 0;
      });
    };

    return CircuitLoader;

  })();

  module.exports = CircuitLoader;

}).call(this);


},{"../circuit/ComponentRegistry.coffee":5,"../core/SimulationParams.coffee":6,"../circuit/Circuit.coffee":7,"../scope/Oscilloscope.coffee":8,"../engine/Hint.coffee":9}],3:[function(require,module,exports){
(function() {
  var Circuit, CircuitSolver, Logger, Observer, Oscilloscope, SimulationParams,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Oscilloscope = require('../scope/oscilloscope.coffee');

  Logger = require('../io/logger.coffee');

  SimulationParams = require('../core/simulationParams.coffee');

  CircuitSolver = require('../engine/circuitSolver.coffee');

  Observer = require('../util/observer.coffee');

  Circuit = (function(_super) {
    __extends(Circuit, _super);

    Circuit.ON_START_UPDATE = "ON_START_UPDATE";

    Circuit.ON_COMPLETE_UPDATE = "ON_END_UPDATE";

    Circuit.ON_RESET = "ON_RESET";

    Circuit.ON_SOLDER = "ON_SOLDER";

    Circuit.ON_DESOLDER = "ON_DESOLDER";

    Circuit.ON_ADD_COMPONENT = "ON_ADD_COMPONENT";

    Circuit.ON_REMOVE_COMPONENT = "ON_MOVE_COMPONENT";

    Circuit.ON_MOVE_COMPONENT = "ON_MOVE_COMPONENT";

    Circuit.ON_ERROR = "ON_ERROR";

    Circuit.ON_WARNING = "ON_WARNING";

    function Circuit() {
      this.Params = new SimulationParams();
      this.clearAndReset();
    }

    Circuit.prototype.clearAndReset = function() {
      var element, _i, _len, _ref;
      _ref = this.elementList != null;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        element = _ref[_i];
        element.destroy();
      }
      this.Solver = new CircuitSolver(this);
      this.nodeList = [];
      this.elementList = [];
      this.voltageSources = [];
      this.scopes = [];
      this.time = 0;
      this.iterations = 0;
      this.clearErrors();
      return this.notifyObservers(this.ON_RESET);
    };

    Circuit.prototype.solder = function(newElement) {
      console.log("\tSoldering " + newElement + ": " + (newElement.dump()));
      this.notifyObservers(this.ON_SOLDER);
      newElement.Circuit = this;
      newElement.setPoints();
      return this.elementList.push(newElement);
    };

    Circuit.prototype.desolder = function(component, destroy) {
      if (destroy == null) {
        destroy = false;
      }
      this.notifyObservers(this.ON_DESOLDER);
      component.Circuit = null;
      this.elementList.remove(component);
      if (destroy) {
        return component.destroy();
      }
    };

    Circuit.prototype.toString = function() {
      return this.Params;
    };

    /* Simulation Frame Computation
    */


    /*
    UpdateCircuit: Updates the circuit each frame.
      1. ) Reconstruct Circuit:
            Rebuilds a data representation of the circuit (only applied when circuit changes)
      2. ) Solve Circuit build matrix representation of the circuit solve for the voltage and current for each component.
            Solving is performed via LU factorization.
    */


    Circuit.prototype.updateCircuit = function() {
      this.notifyObservers(this.ON_START_UPDATE);
      this.Solver.reconstruct();
      if (this.Solver.isStopped) {
        this.Solver.lastTime = 0;
      } else {
        this.Solver.solveCircuit();
      }
      return this.notifyObservers(this.ON_COMPLETE_UPDATE);
    };

    Circuit.prototype.setSelected = function(component) {
      var elm, _i, _len, _ref, _results;
      _ref = this.elementList;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elm = _ref[_i];
        if (elm === component) {
          console.log("Selected: " + (component.dump()));
          this.selectedElm = component;
          _results.push(component.setSelected(true));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Circuit.prototype.warn = function(message) {
      Logger.warn(message);
      return this.warnMessage = message;
    };

    Circuit.prototype.halt = function(message) {
      Logger.error(message);
      return this.stopMessage = message;
    };

    Circuit.prototype.clearErrors = function() {
      this.stopMessage = null;
      return this.stopElm = null;
    };

    /* Circuit Element Accessors:
    */


    Circuit.prototype.getScopes = function() {
      return [];
    };

    Circuit.prototype.findElm = function(searchElm) {
      var circuitElm, _i, _len, _ref;
      _ref = this.elementList;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        circuitElm = _ref[_i];
        if (searchElm === circuitElm) {
          return circuitElm;
        }
      }
      return false;
    };

    Circuit.prototype.getElements = function() {
      return this.elementList;
    };

    Circuit.prototype.getElmByIdx = function(elmIdx) {
      return this.elementList[elmIdx];
    };

    Circuit.prototype.numElements = function() {
      return this.elementList.length;
    };

    Circuit.prototype.getVoltageSources = function() {
      return this.voltageSources;
    };

    /* Nodes
    */


    Circuit.prototype.resetNodes = function() {
      return this.nodeList = [];
    };

    Circuit.prototype.addCircuitNode = function(circuitNode) {
      return this.nodeList.push(circuitNode);
    };

    Circuit.prototype.getNode = function(idx) {
      return this.nodeList[idx];
    };

    Circuit.prototype.getNodes = function() {
      return this.nodeList;
    };

    Circuit.prototype.numNodes = function() {
      return this.nodeList.length;
    };

    Circuit.prototype.findBadNodes = function() {
      var circuitElm, circuitNode, firstCircuitNode, numBadPoints, _i, _j, _len, _len1, _ref, _ref1;
      this.badNodes = [];
      _ref = this.nodeList;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        circuitNode = _ref[_i];
        if (!circuitNode.intern && circuitNode.links.length === 1) {
          numBadPoints = 0;
          firstCircuitNode = circuitNode.links[0];
          _ref1 = this.elementList;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            circuitElm = _ref1[_j];
            if (firstCircuitNode.elm.equal_to(circuitElm) === false && circuitElm.boundingBox.contains(circuitNode.x, circuitNode.y)) {
              numBadPoints++;
            }
          }
          if (numBadPoints > 0) {
            this.badNodes.push(circuitNode);
          }
        }
      }
      return this.badNodes;
    };

    /* Simulation Accessor Methods
    */


    Circuit.prototype.subIterations = function() {
      return this.Solver.subIterations;
    };

    Circuit.prototype.eachComponent = function(callback) {
      var component, _i, _len, _ref, _results;
      _ref = this.elementList;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        component = _ref[_i];
        _results.push(callback(component));
      }
      return _results;
    };

    Circuit.prototype.isStopped = function() {
      return this.Solver.isStopped;
    };

    Circuit.prototype.timeStep = function() {
      return this.Params.timeStep;
    };

    Circuit.prototype.voltageRange = function() {
      return this.Params.voltageRange;
    };

    Circuit.prototype.powerRange = function() {
      return this.Params.powerRange;
    };

    Circuit.prototype.currentSpeed = function() {
      return this.Params.currentSpeed;
    };

    Circuit.prototype.getState = function() {
      return this.state;
    };

    Circuit.prototype.getStamper = function() {
      return this.Solver.getStamper();
    };

    return Circuit;

  })(Observer);

  module.exports = Circuit;

}).call(this);


},{"../scope/oscilloscope.coffee":10,"../io/logger.coffee":11,"../core/simulationParams.coffee":12,"../engine/circuitSolver.coffee":13,"../util/observer.coffee":14}],4:[function(require,module,exports){
(function() {
  var Circuit, CircuitCanvas, CircuitComponent, FormatUtils, Observer, Rectangle, SelectionMarquee, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Observer = require('../util/observer.coffee');

  Circuit = require('../circuit/circuit.coffee');

  CircuitComponent = require('../circuit/circuitComponent.coffee');

  FormatUtils = require('../util/formatUtils.coffee');

  Settings = require('../settings/settings.coffee');

  Rectangle = require('../geom/rectangle.coffee');

  SelectionMarquee = (function(_super) {
    __extends(SelectionMarquee, _super);

    function SelectionMarquee(x1, y1) {
      this.x1 = x1;
      this.y1 = y1;
    }

    SelectionMarquee.prototype.reposition = function(x, y) {
      var _x1, _x2, _y1, _y2;
      _x1 = Math.min(x, this.x1);
      _x2 = Math.max(x, this.x1);
      _y1 = Math.min(y, this.y1);
      _y2 = Math.max(y, this.y1);
      this.x2 = _x2;
      this.y2 = _y2;
      this.x = this.x1 = _x1;
      this.y = this.y1 = _y1;
      this.width = _x2 - _x1;
      return this.height = _y2 - _y1;
    };

    SelectionMarquee.prototype.draw = function(renderContext) {
      renderContext.lineWidth = 0.1;
      if ((this.x1 != null) && (this.x2 != null) && (this.y1 != null) && (this.y2 != null)) {
        renderContext.drawThickLine(this.x1, this.y1, this.x2, this.y1);
        renderContext.drawThickLine(this.x1, this.y2, this.x2, this.y2);
        renderContext.drawThickLine(this.x1, this.y1, this.x1, this.y2);
        return renderContext.drawThickLine(this.x2, this.y1, this.x2, this.y2);
      }
    };

    return SelectionMarquee;

  })(Rectangle);

  CircuitCanvas = (function(_super) {
    __extends(CircuitCanvas, _super);

    function CircuitCanvas(Circuit, Canvas) {
      this.Circuit = Circuit;
      this.Canvas = Canvas;
      this.draw = __bind(this.draw, this);
      this.mouseup = __bind(this.mouseup, this);
      this.mousedown = __bind(this.mousedown, this);
      this.mousemove = __bind(this.mousemove, this);
      this.focusedComponent = null;
      this.dragComponent = null;
      this.width = this.Canvas.width;
      this.height = this.Canvas.height;
      this.context = Sketch.augment(this.Canvas.getContext("2d"), {
        draw: this.draw,
        mousemove: this.mousemove,
        mousedown: this.mousedown,
        mouseup: this.mouseup
      });
      this.Circuit.addObserver(Circuit.ON_END_UPDATE, this.clear);
    }

    CircuitCanvas.prototype.mousemove = function(event) {
      var component, x, y, _i, _len, _ref, _ref1, _results;
      x = event.offsetX;
      y = event.offsetY;
      this.snapX = this.snapGrid(x);
      this.snapY = this.snapGrid(y);
      if (this.marquee != null) {
        return (_ref = this.marquee) != null ? _ref.reposition(x, y) : void 0;
      } else {
        _ref1 = this.Circuit.getElements();
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          component = _ref1[_i];
          if (component.getBoundingBox().contains(x, y)) {
            this.focusedComponent = component;
            _results.push(this.focusedComponent.focused = true);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    };

    CircuitCanvas.prototype.mousedown = function(event) {
      var component, x, y, _i, _len, _ref, _results;
      x = event.offsetX;
      y = event.offsetY;
      this.marquee = new SelectionMarquee(x, y);
      _ref = this.Circuit.getElements();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        component = _ref[_i];
        if (component.getBoundingBox().contains(x, y)) {
          this.dragComponent = component;
          component.beingDragged(true);
          this.focusedComponent = component;
          this.focusedComponent.focused = true;
          if (this.dragComponent.toggle != null) {
            _results.push(this.dragComponent.toggle());
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    CircuitCanvas.prototype.mouseup = function(event) {
      var _ref;
      if ((_ref = this.dragComponent) != null) {
        _ref.beingDragged(false);
      }
      this.dragComponent = null;
      return this.marquee = null;
    };

    CircuitCanvas.prototype.draw = function() {
      var _ref;
      if ((this.snapX != null) && (this.snapY != null)) {
        this.drawCircle(this.snapX, this.snapY, 3, "#F00");
      }
      this.infoText();
      if ((_ref = this.marquee) != null) {
        _ref.draw(this);
      }
      this.Circuit.updateCircuit();
      return this.drawComponents();
    };

    CircuitCanvas.prototype.infoText = function() {
      var arr, idx, _i, _ref, _results;
      if (this.focusedComponent != null) {
        arr = [];
        this.focusedComponent.getInfo(arr);
        _results = [];
        for (idx = _i = 0, _ref = arr.length; 0 <= _ref ? _i < _ref : _i > _ref; idx = 0 <= _ref ? ++_i : --_i) {
          _results.push(this.context.fillText(arr[idx], 500, idx * 10 + 15));
        }
        return _results;
      }
    };

    CircuitCanvas.prototype.drawComponents = function() {
      var component, _i, _len, _ref, _ref1, _results;
      this.clear();
      if (this.context) {
        _ref = this.Circuit.getElements();
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          component = _ref[_i];
          if ((_ref1 = this.marquee) != null ? _ref1.collidesWithComponent(component) : void 0) {
            component.focused = true;
            console.log("COLLIDE: " + component.dump());
          }
          _results.push(this.drawComponent(component));
        }
        return _results;
      }
    };

    CircuitCanvas.prototype.snapGrid = function(x) {
      return (x + (Settings.GRID_SIZE / 2 - 1)) & ~(Settings.GRID_SIZE - 1);
    };

    CircuitCanvas.prototype.drawComponent = function(component) {
      if (component.isSelected()) {
        this.context.strokeStyle = "#FF0";
      }
      return component.draw(this);
    };

    CircuitCanvas.prototype.getCircuitBottom = function() {
      var circuitBottom;
      circuitBottom = -100000000;
      this.Circuit.eachComponent(function(component) {
        var bottom, rect;
        rect = component.boundingBox;
        bottom = rect.height + rect.y;
        if (bottom > circuitBottom) {
          return circuitBottom = bottom;
        }
      });
      return circuitBottom;
    };

    CircuitCanvas.prototype.drawInfo = function() {
      var bottomTextOffset, ybase;
      bottomTextOffset = 100;
      ybase = this.getCircuitBottom() - (1 * 15) - bottomTextOffset;
      this.context.fillText("t = " + (FormatUtils.longFormat(this.Circuit.time)) + " s", 10, 10);
      return this.context.fillText("F.T. = " + this.Circuit.frames, 10, 20);
    };

    CircuitCanvas.prototype.drawWarning = function(context) {
      var msg, warning, _i, _len;
      msg = "";
      for (_i = 0, _len = warningStack.length; _i < _len; _i++) {
        warning = warningStack[_i];
        msg += warning + "\n";
      }
      return console.error("Simulation Warning: " + msg);
    };

    CircuitCanvas.prototype.drawError = function(context) {
      var error, msg, _i, _len;
      msg = "";
      for (_i = 0, _len = errorStack.length; _i < _len; _i++) {
        error = errorStack[_i];
        msg += error + "\n";
      }
      return console.error("Simulation Error: " + msg);
    };

    CircuitCanvas.prototype.fillText = function(text, x, y) {
      return this.context.fillText(text, x, y);
    };

    CircuitCanvas.prototype.fillCircle = function(x, y, radius, lineWidth, fillColor, lineColor) {
      var origLineWidth, origStrokeStyle;
      if (lineWidth == null) {
        lineWidth = Settings.LINE_WIDTH;
      }
      if (fillColor == null) {
        fillColor = '#FF0000';
      }
      if (lineColor == null) {
        lineColor = "#000000";
      }
      origLineWidth = this.context.lineWidth;
      origStrokeStyle = this.context.strokeStyle;
      this.context.fillStyle = fillColor;
      this.context.strokeStyle = lineColor;
      this.context.beginPath();
      this.context.lineWidth = lineWidth;
      this.context.arc(x, y, radius, 0, 2 * Math.PI, true);
      this.context.stroke();
      this.context.fill();
      this.context.closePath();
      this.context.strokeStyle = origStrokeStyle;
      return this.context.lineWidth = origLineWidth;
    };

    CircuitCanvas.prototype.drawCircle = function(x, y, radius, lineWidth, lineColor) {
      var origLineWidth, origStrokeStyle;
      if (lineWidth == null) {
        lineWidth = Settings.LINE_WIDTH;
      }
      if (lineColor == null) {
        lineColor = "#000000";
      }
      origLineWidth = this.context.lineWidth;
      origStrokeStyle = this.context.strokeStyle;
      this.context.strokeStyle = lineColor;
      this.context.beginPath();
      this.context.lineWidth = lineWidth;
      this.context.arc(x, y, radius, 0, 2 * Math.PI, true);
      this.context.stroke();
      this.context.closePath();
      this.context.lineWidth = origLineWidth;
      return this.context.strokeStyle = origStrokeStyle;
    };

    CircuitCanvas.prototype.drawThickLinePt = function(pa, pb, color) {
      return this.drawThickLine(pa.x, pa.y, pb.x, pb.y, color);
    };

    CircuitCanvas.prototype.drawThickLine = function(x, y, x2, y2, color) {
      var origLineWidth, origStrokeStyle;
      if (color == null) {
        color = Settings.FG_COLOR;
      }
      origLineWidth = this.context.lineWidth;
      origStrokeStyle = this.context.strokeStyle;
      this.context.strokeStyle = color;
      this.context.beginPath();
      this.context.moveTo(x, y);
      this.context.lineTo(x2, y2);
      this.context.stroke();
      this.context.closePath();
      this.context.lineWidth = origLineWidth;
      return this.context.strokeStyle = origStrokeStyle;
    };

    CircuitCanvas.prototype.drawThickPolygon = function(xlist, ylist, color) {
      var i, _i, _ref;
      for (i = _i = 0, _ref = xlist.length - 1; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        this.drawThickLine(xlist[i], ylist[i], xlist[i + 1], ylist[i + 1], color);
      }
      return this.drawThickLine(xlist[i], ylist[i], xlist[0], ylist[0], color);
    };

    CircuitCanvas.prototype.drawThickPolygonP = function(polygon, color) {
      var i, numVertices, _i, _ref;
      numVertices = polygon.numPoints();
      for (i = _i = 0, _ref = numVertices - 1; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        this.drawThickLine(polygon.getX(i), polygon.getY(i), polygon.getX(i + 1), polygon.getY(i + 1), color);
      }
      return this.drawThickLine(polygon.getX(i), polygon.getY(i), polygon.getX(0), polygon.getY(0), color);
    };

    CircuitCanvas.prototype.clear = function() {};

    return CircuitCanvas;

  })(Observer);

  module.exports = CircuitCanvas;

}).call(this);


},{"../util/observer.coffee":14,"../circuit/circuit.coffee":3,"../circuit/circuitComponent.coffee":15,"../util/formatUtils.coffee":16,"../settings/settings.coffee":17,"../geom/rectangle.coffee":18}],6:[function(require,module,exports){
(function() {
  var SimulationParams;

  SimulationParams = (function() {
    function SimulationParams(paramsObj) {
      this.completionStatus = (paramsObj != null ? paramsObj['completion_status'] : void 0) || "in development";
      this.createdAt = paramsObj != null ? paramsObj['created_at'] : void 0;
      this.currentSpeed = (paramsObj != null ? paramsObj['current_speed'] : void 0) || 63;
      this.updatedAt = paramsObj != null ? paramsObj['updated_at'] : void 0;
      this.description = (paramsObj != null ? paramsObj['description'] : void 0) || "";
      this.flags = (paramsObj != null ? paramsObj['flags'] : void 0) || 1;
      this.id = (paramsObj != null ? paramsObj['id'] : void 0) || null;
      this.name = (paramsObj != null ? paramsObj['name_unique'] : void 0) || "default";
      this.powerRange = (paramsObj != null ? paramsObj['power_range'] : void 0) || 62.0;
      this.voltageRange = (paramsObj != null ? paramsObj['voltage_range'] : void 0) || 10.0;
      this.simSpeed = this.convertSimSpeed((paramsObj != null ? paramsObj['sim_speed'] : void 0) || 10.0);
      this.timeStep = (paramsObj != null ? paramsObj['time_step'] : void 0) || 5.0e-06;
      this.title = (paramsObj != null ? paramsObj['title'] : void 0) || "Default";
      this.topic = (paramsObj != null ? paramsObj['topic'] : void 0) || null;
      if (this.timeStep == null) {
        throw new Error("Circuit params is missing its time step (was null)!");
      }
    }

    SimulationParams.prototype.toString = function() {
      return ["", "" + this.title, "================================================================", "\tName:        " + this.name, "\tTopic:       " + this.topic, "\tStatus:      " + this.completionStatus, "\tCreated at:  " + this.createdAt, "\tUpdated At:  " + this.updatedAt, "\tDescription: " + this.description, "\tId:          " + this.id, "\tTitle:       " + this.title, "----------------------------------------------------------------", "\tFlags:       " + this.flags, "\tTimeStep:    " + this.timeStep, "\tSim Speed:   " + this.simSpeed, "\tCur Speed:   " + this.currentSpeed, "\tVolt. Range: " + this.voltageRange, "\tPwr Range:   " + this.powerRange, ""].join("\n");
    };

    SimulationParams.prototype.convertSimSpeed = function(speed) {
      return Math.floor(Math.log(10 * speed) * 24.0 + 61.5);
    };

    SimulationParams.prototype.setCurrentMult = function(mult) {
      return this.currentMult = mult;
    };

    SimulationParams.prototype.getCurrentMult = function() {
      return this.currentMult;
    };

    return SimulationParams;

  })();

  module.exports = SimulationParams;

}).call(this);


},{}],8:[function(require,module,exports){
(function() {
  var Oscilloscope;

  Oscilloscope = (function() {
    function Oscilloscope(timeStep) {
      var chartDiv, i, xbuffer_size, _i,
        _this = this;
      this.timeStep = timeStep != null ? timeStep : 1;
      this.timeBase = 0;
      this.frames = 0;
      this.seriesData = [[], [], [], [], [], [], [], [], []];
      xbuffer_size = 150;
      chartDiv = document.getElementById("chart");
      for (i = _i = 0; 0 <= xbuffer_size ? _i <= xbuffer_size : _i >= xbuffer_size; i = 0 <= xbuffer_size ? ++_i : --_i) {
        this.addData(0);
      }
      setInterval(function() {
        _this.step();
        return graph.update();
      }, 40);
    }

    Oscilloscope.prototype.step = function() {
      this.frames += 1;
      this.removeData(1);
      return this.addData(0.5 * Math.sin(this.frames / 10) + 0.5);
    };

    Oscilloscope.prototype.addData = function(value) {
      var index, item, _i, _len, _ref, _results;
      index = this.seriesData[0].length;
      _ref = this.seriesData;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        _results.push(item.push({
          x: index * this.timeStep + this.timeBase,
          y: value
        }));
      }
      return _results;
    };

    Oscilloscope.prototype.removeData = function(data) {
      var item, _i, _len, _ref;
      _ref = this.seriesData;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        item.shift();
      }
      return this.timeBase += this.timeStep;
    };

    return Oscilloscope;

  })();

  module.exports = Oscilloscope;

}).call(this);


},{}],9:[function(require,module,exports){
(function() {
  var Hint;

  Hint = (function() {
    Hint.HINT_LC = "@HINT_LC";

    Hint.HINT_RC = "@HINT_RC";

    Hint.HINT_3DB_C = "@HINT_3DB_C";

    Hint.HINT_TWINT = "@HINT_TWINT";

    Hint.HINT_3DB_L = "@HINT_3DB_L";

    Hint.hintType = -1;

    Hint.hintItem1 = -1;

    Hint.hintItem2 = -1;

    function Hint(Circuit) {
      this.Circuit = Circuit;
    }

    Hint.prototype.readHint = function(st) {
      if (typeof st === 'string') {
        st = st.split(' ');
      }
      this.hintType = st[0];
      this.hintItem1 = st[1];
      return this.hintItem2 = st[2];
    };

    Hint.prototype.getHint = function() {
      var c1, c2, ce, ie, re;
      c1 = this.Circuit.getElmByIdx(this.hintItem1);
      c2 = this.Circuit.getElmByIdx(this.hintItem2);
      if ((c1 == null) || (c2 == null)) {
        return null;
      }
      if (this.hintType === this.HINT_LC) {
        if (!(c1 instanceof InductorElm)) {
          return null;
        }
        if (!(c2 instanceof CapacitorElm)) {
          return null;
        }
        ie = c1;
        ce = c2;
        return "res.f = " + getUnitText(1 / (2 * Math.PI * Math.sqrt(ie.inductance * ce.capacitance)), "Hz");
      }
      if (this.hintType === this.HINT_RC) {
        if (!(c1 instanceof ResistorElm)) {
          return null;
        }
        if (!(c2 instanceof CapacitorElm)) {
          return null;
        }
        re = c1;
        ce = c2;
        return "RC = " + getUnitText(re.resistance * ce.capacitance, "s");
      }
      if (this.hintType === this.HINT_3DB_C) {
        if (!(c1 instanceof ResistorElm)) {
          return null;
        }
        if (!(c2 instanceof CapacitorElm)) {
          return null;
        }
        re = c1;
        ce = c2;
        return "f.3db = " + getUnitText(1 / (2 * Math.PI * re.resistance * ce.capacitance), "Hz");
      }
      if (this.hintType === this.HINT_3DB_L) {
        if (!(c1 instanceof ResistorElm)) {
          return null;
        }
        if (!(c2 instanceof InductorElm)) {
          return null;
        }
        re = c1;
        ie = c2;
        return "f.3db = " + getUnitText(re.resistance / (2 * Math.PI * ie.inductance), "Hz");
      }
      if (this.hintType === this.HINT_TWINT) {
        if (!(c1 instanceof ResistorElm)) {
          return null;
        }
        if (!(c2 instanceof CapacitorElm)) {
          return null;
        }
        re = c1;
        ce = c2;
        return "fc = " + getUnitText(1 / (2 * Math.PI * re.resistance * ce.capacitance), "Hz");
      }
      return null;
    };

    return Hint;

  })();

  module.exports = Hint;

}).call(this);


},{}],10:[function(require,module,exports){
(function() {
  var Oscilloscope;

  Oscilloscope = (function() {
    function Oscilloscope(timeStep) {
      var chartDiv, i, xbuffer_size, _i,
        _this = this;
      this.timeStep = timeStep != null ? timeStep : 1;
      this.timeBase = 0;
      this.frames = 0;
      this.seriesData = [[], [], [], [], [], [], [], [], []];
      xbuffer_size = 150;
      chartDiv = document.getElementById("chart");
      for (i = _i = 0; 0 <= xbuffer_size ? _i <= xbuffer_size : _i >= xbuffer_size; i = 0 <= xbuffer_size ? ++_i : --_i) {
        this.addData(0);
      }
      setInterval(function() {
        _this.step();
        return graph.update();
      }, 40);
    }

    Oscilloscope.prototype.step = function() {
      this.frames += 1;
      this.removeData(1);
      return this.addData(0.5 * Math.sin(this.frames / 10) + 0.5);
    };

    Oscilloscope.prototype.addData = function(value) {
      var index, item, _i, _len, _ref, _results;
      index = this.seriesData[0].length;
      _ref = this.seriesData;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        _results.push(item.push({
          x: index * this.timeStep + this.timeBase,
          y: value
        }));
      }
      return _results;
    };

    Oscilloscope.prototype.removeData = function(data) {
      var item, _i, _len, _ref;
      _ref = this.seriesData;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        item.shift();
      }
      return this.timeBase += this.timeStep;
    };

    return Oscilloscope;

  })();

  module.exports = Oscilloscope;

}).call(this);


},{}],11:[function(require,module,exports){
(function() {
  var Logger;

  Logger = (function() {
    var errorStack, warningStack;

    function Logger() {}

    errorStack = new Array();

    warningStack = new Array();

    Logger.error = function(msg) {
      console.error("Error: " + msg);
      return errorStack.push(msg);
    };

    Logger.warn = function(msg) {
      console.error("Warning: " + msg);
      return warningStack.push(msg);
    };

    return Logger;

  })();

  module.exports = Logger;

}).call(this);


},{}],12:[function(require,module,exports){
(function() {
  var SimulationParams;

  SimulationParams = (function() {
    function SimulationParams(paramsObj) {
      this.completionStatus = (paramsObj != null ? paramsObj['completion_status'] : void 0) || "in development";
      this.createdAt = paramsObj != null ? paramsObj['created_at'] : void 0;
      this.currentSpeed = (paramsObj != null ? paramsObj['current_speed'] : void 0) || 63;
      this.updatedAt = paramsObj != null ? paramsObj['updated_at'] : void 0;
      this.description = (paramsObj != null ? paramsObj['description'] : void 0) || "";
      this.flags = (paramsObj != null ? paramsObj['flags'] : void 0) || 1;
      this.id = (paramsObj != null ? paramsObj['id'] : void 0) || null;
      this.name = (paramsObj != null ? paramsObj['name_unique'] : void 0) || "default";
      this.powerRange = (paramsObj != null ? paramsObj['power_range'] : void 0) || 62.0;
      this.voltageRange = (paramsObj != null ? paramsObj['voltage_range'] : void 0) || 10.0;
      this.simSpeed = this.convertSimSpeed((paramsObj != null ? paramsObj['sim_speed'] : void 0) || 10.0);
      this.timeStep = (paramsObj != null ? paramsObj['time_step'] : void 0) || 5.0e-06;
      this.title = (paramsObj != null ? paramsObj['title'] : void 0) || "Default";
      this.topic = (paramsObj != null ? paramsObj['topic'] : void 0) || null;
      if (this.timeStep == null) {
        throw new Error("Circuit params is missing its time step (was null)!");
      }
    }

    SimulationParams.prototype.toString = function() {
      return ["", "" + this.title, "================================================================", "\tName:        " + this.name, "\tTopic:       " + this.topic, "\tStatus:      " + this.completionStatus, "\tCreated at:  " + this.createdAt, "\tUpdated At:  " + this.updatedAt, "\tDescription: " + this.description, "\tId:          " + this.id, "\tTitle:       " + this.title, "----------------------------------------------------------------", "\tFlags:       " + this.flags, "\tTimeStep:    " + this.timeStep, "\tSim Speed:   " + this.simSpeed, "\tCur Speed:   " + this.currentSpeed, "\tVolt. Range: " + this.voltageRange, "\tPwr Range:   " + this.powerRange, ""].join("\n");
    };

    SimulationParams.prototype.convertSimSpeed = function(speed) {
      return Math.floor(Math.log(10 * speed) * 24.0 + 61.5);
    };

    SimulationParams.prototype.setCurrentMult = function(mult) {
      return this.currentMult = mult;
    };

    SimulationParams.prototype.getCurrentMult = function() {
      return this.currentMult;
    };

    return SimulationParams;

  })();

  module.exports = SimulationParams;

}).call(this);


},{}],14:[function(require,module,exports){
(function() {
  var Observer,
    __slice = [].slice;

  Observer = (function() {
    function Observer() {}

    Observer.prototype.addObserver = function(event, fn) {
      var _base;
      this._events || (this._events = {});
      (_base = this._events)[event] || (_base[event] = []);
      return this._events[event].push(fn);
    };

    Observer.prototype.removeObserver = function(event, fn) {
      this._events || (this._events = {});
      if (this._events[event]) {
        return this._events[event].splice(this._events[event].indexOf(fn), 1);
      }
    };

    Observer.prototype.notifyObservers = function() {
      var args, callback, event, _i, _len, _ref, _results;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      this._events || (this._events = {});
      if (this._events[event]) {
        _ref = this._events[event];
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          callback = _ref[_i];
          _results.push(callback.apply(this, args));
        }
        return _results;
      }
    };

    Observer.prototype.getObservers = function() {
      return this._events;
    };

    return Observer;

  })();

  module.exports = Observer;

}).call(this);


},{}],16:[function(require,module,exports){
(function() {
  var FormatUtils;

  FormatUtils = (function() {
    function FormatUtils() {}

    FormatUtils.showFormat = function(decimalNum) {
      return decimalNum.toPrecision(2);
    };

    FormatUtils.shortFormat = function(decimalNum) {
      return decimalNum.toPrecision(1);
    };

    FormatUtils.longFormat = function(decimalNum) {
      return decimalNum.toPrecision(4);
    };

    /*
    Removes commas from a number containing a string:
    e.g. 1,234,567.99 -> 1234567.99
    */


    FormatUtils.noCommaFormat = function(numberWithCommas) {
      return numberWithCommas.replace(/,/g, '');
    };

    /*
    Adds commas to a number, and returns the string representation of that number
    e.g. 1234567.99 -> 1,234,567.99
    */


    FormatUtils.commaFormat = function(plainNumber) {
      var pattern, x, x1, x2;
      plainNumber += "";
      x = plainNumber.split(".");
      x1 = x[0];
      x2 = (x.length > 1 ? "." + x[1] : "");
      pattern = /(\d+)(\d{3})/;
      while (pattern.test(x1)) {
        x1 = x1.replace(pattern, "$1" + "," + "$2");
      }
      return x1 + x2;
    };

    return FormatUtils;

  })();

  module.exports = FormatUtils;

}).call(this);


},{}],17:[function(require,module,exports){
(function(){/*
Stores Environment-specific settings

These are the global settings for Maxwell and should defined by the user.
Settings do not change by loading a new circuit.
*/


(function() {
  var Settings;

  Settings = (function() {
    var ColorPalette;

    function Settings() {}

    ColorPalette = {
      'voltageScale': ["#ff0000", "#f70707", "#ef0f0f", "#e71717", "#df1f1f", "#d72727", "#cf2f2f", "#c73737", "#bf3f3f", "#b74747", "#af4f4f", "#a75757", "#9f5f5f", "#976767", "#8f6f6f", "#877777", "#7f7f7f", "#778777", "#6f8f6f", "#679767", "#5f9f5f", "#57a757", "#4faf4f", "#47b747", "#3fbf3f", "#37c737", "#2fcf2f", "#27d727", "#1fdf1f", "#17e717", "#0fef0f", "#07f707", "#00ff00"],
      'aliceblue': '#f0f8ff',
      'antiquewhite': '#faebd7',
      'aqua': '#00ffff',
      'aquamarine': '#7fffd4',
      'azure': '#f0ffff',
      'beige': '#f5f5dc',
      'bisque': '#ffe4c4',
      'black': '#000000',
      'blanchedalmond': '#ffebcd',
      'blue': '#0000ff',
      'blueviolet': '#8a2be2',
      'brown': '#a52a2a',
      'burlywood': '#deb887',
      'cadetblue': '#5f9ea0',
      'chartreuse': '#7fff00',
      'chocolate': '#d2691e',
      'coral': '#ff7f50',
      'cornflowerblue': '#6495ed',
      'cornsilk': '#fff8dc',
      'crimson': '#dc143c',
      'cyan': '#00ffff',
      'darkblue': '#00008b',
      'darkcyan': '#008b8b',
      'darkgoldenrod': '#b8860b',
      'darkgray': '#a9a9a9',
      'darkgrey': '#a9a9a9',
      'darkgreen': '#006400',
      'darkkhaki': '#bdb76b',
      'darkmagenta': '#8b008b',
      'darkolivegreen': '#556b2f',
      'darkorange': '#ff8c00',
      'darkorchid': '#9932cc',
      'darkred': '#8b0000',
      'darksalmon': '#e9967a',
      'darkseagreen': '#8fbc8f',
      'darkslateblue': '#483d8b',
      'darkslategray': '#2f4f4f',
      'darkslategrey': '#2f4f4f',
      'darkturquoise': '#00ced1',
      'darkviolet': '#9400d3',
      'deeppink': '#ff1493',
      'deepskyblue': '#00bfff',
      'dimgray': '#696969',
      'dimgrey': '#696969',
      'dodgerblue': '#1e90ff',
      'firebrick': '#b22222',
      'floralwhite': '#fffaf0',
      'forestgreen': '#228b22',
      'fuchsia': '#ff00ff',
      'gainsboro': '#dcdcdc',
      'ghostwhite': '#f8f8ff',
      'gold': '#ffd700',
      'goldenrod': '#daa520',
      'gray': '#808080',
      'grey': '#808080',
      'green': '#008000',
      'greenyellow': '#adff2f',
      'honeydew': '#f0fff0',
      'hotpink': '#ff69b4',
      'indianred': '#cd5c5c',
      'indigo': '#4b0082',
      'ivory': '#fffff0',
      'khaki': '#f0e68c',
      'lavender': '#e6e6fa',
      'lavenderblush': '#fff0f5',
      'lawngreen': '#7cfc00',
      'lemonchiffon': '#fffacd',
      'lightblue': '#add8e6',
      'lightcoral': '#f08080',
      'lightcyan': '#e0ffff',
      'lightgoldenrodyellow': '#fafad2',
      'lightgray': '#d3d3d3',
      'lightgrey': '#d3d3d3',
      'lightgreen': '#90ee90',
      'lightpink': '#ffb6c1',
      'lightsalmon': '#ffa07a',
      'lightseagreen': '#20b2aa',
      'lightskyblue': '#87cefa',
      'lightslategray': '#778899',
      'lightslategrey': '#778899',
      'lightsteelblue': '#b0c4de',
      'lightyellow': '#ffffe0',
      'lime': '#00ff00',
      'limegreen': '#32cd32',
      'linen': '#faf0e6',
      'magenta': '#ff00ff',
      'maroon': '#800000',
      'mediumaquamarine': '#66cdaa',
      'mediumblue': '#0000cd',
      'mediumorchid': '#ba55d3',
      'mediumpurple': '#9370d8',
      'mediumseagreen': '#3cb371',
      'mediumslateblue': '#7b68ee',
      'mediumspringgreen': '#00fa9a',
      'mediumturquoise': '#48d1cc',
      'mediumvioletred': '#c71585',
      'midnightblue': '#191970',
      'mintcream': '#f5fffa',
      'mistyrose': '#ffe4e1',
      'moccasin': '#ffe4b5',
      'navajowhite': '#ffdead',
      'navy': '#000080',
      'oldlace': '#fdf5e6',
      'olive': '#808000',
      'olivedrab': '#6b8e23',
      'orange': '#ffa500',
      'orangered': '#ff4500',
      'orchid': '#da70d6',
      'palegoldenrod': '#eee8aa',
      'palegreen': '#98fb98',
      'paleturquoise': '#afeeee',
      'palevioletred': '#d87093',
      'papayawhip': '#ffefd5',
      'peachpuff': '#ffdab9',
      'peru': '#cd853f',
      'pink': '#ffc0cb',
      'plum': '#dda0dd',
      'powderblue': '#b0e0e6',
      'purple': '#800080',
      'red': '#ff0000',
      'rosybrown': '#bc8f8f',
      'royalblue': '#4169e1',
      'saddlebrown': '#8b4513',
      'salmon': '#fa8072',
      'sandybrown': '#f4a460',
      'seagreen': '#2e8b57',
      'seashell': '#fff5ee',
      'sienna': '#a0522d',
      'silver': '#c0c0c0',
      'skyblue': '#87ceeb',
      'slateblue': '#6a5acd',
      'slategray': '#708090',
      'slategrey': '#708090',
      'snow': '#fffafa',
      'springgreen': '#00ff7f',
      'steelblue': '#4682b4',
      'tan': '#d2b48c',
      'teal': '#008080',
      'thistle': '#d8bfd8',
      'tomato': '#ff6347',
      'turquoise': '#40e0d0',
      'violet': '#ee82ee',
      'wheat': '#f5deb3',
      'white': '#ffffff',
      'whitesmoke': '#f5f5f5',
      'yellow': '#ffff00',
      'yellowgreen': '#9acd32'
    };

    Settings.FRACTIONAL_DIGITS = 2;

    Settings.CURRENT_SEGMENT_LENGTH = 16;

    Settings.POST_RADIUS = 1;

    Settings.CURRENT_RADIUS = 1;

    Settings.LINE_WIDTH = 2;

    Settings.GRID_SIZE = 16;

    Settings.SMALL_GRID = false;

    Settings.SHOW_VALUES = false;

    Settings.SELECT_COLOR = ColorPalette.orange;

    Settings.POST_COLOR_SELECTED = ColorPalette.orange;

    Settings.POST_COLOR = ColorPalette.black;

    Settings.DOTS_COLOR = ColorPalette.yellow;

    Settings.DOTS_OUTLINE = ColorPalette.orange;

    Settings.TEXT_COLOR = ColorPalette.black;

    Settings.TEXT_ERROR_COLOR = ColorPalette.red;

    Settings.TEXT_WARNING_COLOR = ColorPalette.yellow;

    Settings.SELECTION_MARQUEE_COLOR = ColorPalette.orange;

    Settings.GRID_COLOR = ColorPalette.darkyellow;

    Settings.BG_COLOR = ColorPalette.white;

    Settings.FG_COLOR = ColorPalette.darkgray;

    Settings.ERROR_COLOR = ColorPalette.darkred;

    Settings.WARNING_COLOR = ColorPalette.orange;

    return Settings;

  })();

  module.exports = Settings;

}).call(this);


})()
},{}],18:[function(require,module,exports){
(function() {
  var Rectangle;

  Rectangle = (function() {
    function Rectangle(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }

    Rectangle.prototype.contains = function(x, y) {
      return x >= this.x && x <= (this.x + this.width) && y >= this.y && (y <= this.y + this.height);
    };

    Rectangle.prototype.equals = function(otherRect) {
      if (otherRect != null) {
        if (otherRect.x === this.x && otherRect.y === this.y && otherRect.width === this.width && otherRect.height === this.height) {
          return true;
        }
      }
      return false;
    };

    Rectangle.prototype.intersects = function(otherRect) {
      var otherX, otherX2, otherY, otherY2;
      this.x2 = this.x + this.width;
      this.y2 = this.y + this.height;
      otherX = otherRect.x;
      otherY = otherRect.y;
      otherX2 = otherRect.x + otherRect.width;
      otherY2 = otherRect.y + otherRect.height;
      return this.x < otherX2 && this.x2 > otherX && this.y < otherY2 && this.y2 > otherY;
    };

    Rectangle.prototype.collidesWithComponent = function(circuitComponent) {
      return this.intersects(circuitComponent.getBoundingBox());
    };

    return Rectangle;

  })();

  module.exports = Rectangle;

}).call(this);


},{}],19:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],5:[function(require,module,exports){
(function(process){(function() {
  var CapacitorElm, ComponentRegistry, CurrentElm, DiodeElm, GroundElm, InductorElm, MosfetElm, OpAmpElm, OutputElm, ProbeElm, RailElm, ResistorElm, SparkGapElm, Switch2Elm, SwitchElm, TextElm, TransistorElm, VarRailElm, VoltageElm, WireElm, ZenerElm;

  WireElm = require('./components/WireElm.coffee');

  ResistorElm = require('./components/ResistorElm.coffee');

  GroundElm = require('./components/GroundElm.coffee');

  VoltageElm = require('./components/VoltageElm.coffee');

  DiodeElm = require('./components/DiodeElm.coffee');

  OutputElm = require('./components/OutputElm.coffee');

  SwitchElm = require('./components/SwitchElm.coffee');

  CapacitorElm = require('./components/CapacitorElm.coffee');

  InductorElm = require('./components/InductorElm.coffee');

  SparkGapElm = require('./components/SparkGapElm.coffee');

  CurrentElm = require('./components/CurrentElm.coffee');

  RailElm = require('./components/RailElm.coffee');

  MosfetElm = require('./components/MosfetElm.coffee');

  TransistorElm = require('./components/TransistorElm.coffee');

  VarRailElm = require('./components/VarRailElm.coffee');

  OpAmpElm = require('./components/OpAmpElm.coffee');

  ZenerElm = require('./components/ZenerElm.coffee');

  Switch2Elm = require('./components/Switch2Elm.coffee');

  TextElm = require('./components/TextElm.coffee');

  ProbeElm = require('./components/ProbeElm.coffee');

  ComponentRegistry = (function() {
    function ComponentRegistry() {}

    ComponentRegistry.ComponentDefs = {
      'w': WireElm,
      'r': ResistorElm,
      'g': GroundElm,
      'l': InductorElm,
      'c': CapacitorElm,
      'v': VoltageElm,
      'd': DiodeElm,
      's': SwitchElm,
      '187': SparkGapElm,
      'a': OpAmpElm,
      'f': MosfetElm,
      'R': RailElm,
      '172': VarRailElm,
      'z': ZenerElm,
      'i': CurrentElm,
      't': TransistorElm,
      'S': Switch2Elm,
      'x': TextElm,
      'o': ProbeElm,
      'O': OutputElm
    };

    ComponentRegistry.registerAll = function() {
      var Component, _i, _len, _ref, _results;
      _ref = this.ComponentDefs;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        Component = _ref[_i];
        if (process.env.NODE_ENV === 'development') {
          console.log("Registering Element: " + Component.prototype + " ");
        }
        _results.push(this.register(Component));
      }
      return _results;
    };

    ComponentRegistry.register = function(componentConstructor) {
      var dumpClass, dumpType, e, newComponent;
      if (componentConstructor == null) {
        console.error("nil constructor");
      }
      try {
        newComponent = new componentConstructor(0, 0, 0, 0, 0, null);
        dumpType = newComponent.getDumpType();
        dumpClass = componentConstructor;
        if (newComponent == null) {
          console.error("Component is nil!");
        }
        if (this.dumpTypes[dumpType] === dumpClass) {
          console.log("" + componentConstructor + " is a dump class");
          return;
        }
        if (this.dumpTypes[dumpType] != null) {
          console.log("Dump type conflict: " + dumpType + " " + this.dumpTypes[dumpType]);
          return;
        }
        return this.dumpTypes[dumpType] = componentConstructor;
      } catch (_error) {
        e = _error;
        return Logger.warn("Element: " + componentConstructor.prototype + " Not yet implemented: [" + e.message + "]");
      }
    };

    return ComponentRegistry;

  })();

  module.exports = ComponentRegistry;

}).call(this);


})(require("__browserify_process"))
},{"./components/WireElm.coffee":20,"./components/ResistorElm.coffee":21,"./components/GroundElm.coffee":22,"./components/VoltageElm.coffee":23,"./components/DiodeElm.coffee":24,"./components/OutputElm.coffee":25,"./components/SwitchElm.coffee":26,"./components/CapacitorElm.coffee":27,"./components/InductorElm.coffee":28,"./components/SparkGapElm.coffee":29,"./components/CurrentElm.coffee":30,"./components/RailElm.coffee":31,"./components/MosfetElm.coffee":32,"./components/TransistorElm.coffee":33,"./components/VarRailElm.coffee":34,"./components/OpAmpElm.coffee":35,"./components/ZenerElm.coffee":36,"./components/Switch2Elm.coffee":37,"./components/TextElm.coffee":38,"./components/ProbeElm.coffee":39,"__browserify_process":19}],7:[function(require,module,exports){
(function() {
  var Circuit, CircuitSolver, Logger, Observer, Oscilloscope, SimulationParams,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Oscilloscope = require('../scope/oscilloscope.coffee');

  Logger = require('../io/logger.coffee');

  SimulationParams = require('../core/simulationParams.coffee');

  CircuitSolver = require('../engine/circuitSolver.coffee');

  Observer = require('../util/observer.coffee');

  Circuit = (function(_super) {
    __extends(Circuit, _super);

    Circuit.ON_START_UPDATE = "ON_START_UPDATE";

    Circuit.ON_COMPLETE_UPDATE = "ON_END_UPDATE";

    Circuit.ON_RESET = "ON_RESET";

    Circuit.ON_SOLDER = "ON_SOLDER";

    Circuit.ON_DESOLDER = "ON_DESOLDER";

    Circuit.ON_ADD_COMPONENT = "ON_ADD_COMPONENT";

    Circuit.ON_REMOVE_COMPONENT = "ON_MOVE_COMPONENT";

    Circuit.ON_MOVE_COMPONENT = "ON_MOVE_COMPONENT";

    Circuit.ON_ERROR = "ON_ERROR";

    Circuit.ON_WARNING = "ON_WARNING";

    function Circuit() {
      this.Params = new SimulationParams();
      this.clearAndReset();
    }

    Circuit.prototype.clearAndReset = function() {
      var element, _i, _len, _ref;
      _ref = this.elementList != null;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        element = _ref[_i];
        element.destroy();
      }
      this.Solver = new CircuitSolver(this);
      this.nodeList = [];
      this.elementList = [];
      this.voltageSources = [];
      this.scopes = [];
      this.time = 0;
      this.iterations = 0;
      this.clearErrors();
      return this.notifyObservers(this.ON_RESET);
    };

    Circuit.prototype.solder = function(newElement) {
      console.log("\tSoldering " + newElement + ": " + (newElement.dump()));
      this.notifyObservers(this.ON_SOLDER);
      newElement.Circuit = this;
      newElement.setPoints();
      return this.elementList.push(newElement);
    };

    Circuit.prototype.desolder = function(component, destroy) {
      if (destroy == null) {
        destroy = false;
      }
      this.notifyObservers(this.ON_DESOLDER);
      component.Circuit = null;
      this.elementList.remove(component);
      if (destroy) {
        return component.destroy();
      }
    };

    Circuit.prototype.toString = function() {
      return this.Params;
    };

    /* Simulation Frame Computation
    */


    /*
    UpdateCircuit: Updates the circuit each frame.
      1. ) Reconstruct Circuit:
            Rebuilds a data representation of the circuit (only applied when circuit changes)
      2. ) Solve Circuit build matrix representation of the circuit solve for the voltage and current for each component.
            Solving is performed via LU factorization.
    */


    Circuit.prototype.updateCircuit = function() {
      this.notifyObservers(this.ON_START_UPDATE);
      this.Solver.reconstruct();
      if (this.Solver.isStopped) {
        this.Solver.lastTime = 0;
      } else {
        this.Solver.solveCircuit();
      }
      return this.notifyObservers(this.ON_COMPLETE_UPDATE);
    };

    Circuit.prototype.setSelected = function(component) {
      var elm, _i, _len, _ref, _results;
      _ref = this.elementList;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elm = _ref[_i];
        if (elm === component) {
          console.log("Selected: " + (component.dump()));
          this.selectedElm = component;
          _results.push(component.setSelected(true));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Circuit.prototype.warn = function(message) {
      Logger.warn(message);
      return this.warnMessage = message;
    };

    Circuit.prototype.halt = function(message) {
      Logger.error(message);
      return this.stopMessage = message;
    };

    Circuit.prototype.clearErrors = function() {
      this.stopMessage = null;
      return this.stopElm = null;
    };

    /* Circuit Element Accessors:
    */


    Circuit.prototype.getScopes = function() {
      return [];
    };

    Circuit.prototype.findElm = function(searchElm) {
      var circuitElm, _i, _len, _ref;
      _ref = this.elementList;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        circuitElm = _ref[_i];
        if (searchElm === circuitElm) {
          return circuitElm;
        }
      }
      return false;
    };

    Circuit.prototype.getElements = function() {
      return this.elementList;
    };

    Circuit.prototype.getElmByIdx = function(elmIdx) {
      return this.elementList[elmIdx];
    };

    Circuit.prototype.numElements = function() {
      return this.elementList.length;
    };

    Circuit.prototype.getVoltageSources = function() {
      return this.voltageSources;
    };

    /* Nodes
    */


    Circuit.prototype.resetNodes = function() {
      return this.nodeList = [];
    };

    Circuit.prototype.addCircuitNode = function(circuitNode) {
      return this.nodeList.push(circuitNode);
    };

    Circuit.prototype.getNode = function(idx) {
      return this.nodeList[idx];
    };

    Circuit.prototype.getNodes = function() {
      return this.nodeList;
    };

    Circuit.prototype.numNodes = function() {
      return this.nodeList.length;
    };

    Circuit.prototype.findBadNodes = function() {
      var circuitElm, circuitNode, firstCircuitNode, numBadPoints, _i, _j, _len, _len1, _ref, _ref1;
      this.badNodes = [];
      _ref = this.nodeList;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        circuitNode = _ref[_i];
        if (!circuitNode.intern && circuitNode.links.length === 1) {
          numBadPoints = 0;
          firstCircuitNode = circuitNode.links[0];
          _ref1 = this.elementList;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            circuitElm = _ref1[_j];
            if (firstCircuitNode.elm.equal_to(circuitElm) === false && circuitElm.boundingBox.contains(circuitNode.x, circuitNode.y)) {
              numBadPoints++;
            }
          }
          if (numBadPoints > 0) {
            this.badNodes.push(circuitNode);
          }
        }
      }
      return this.badNodes;
    };

    /* Simulation Accessor Methods
    */


    Circuit.prototype.subIterations = function() {
      return this.Solver.subIterations;
    };

    Circuit.prototype.eachComponent = function(callback) {
      var component, _i, _len, _ref, _results;
      _ref = this.elementList;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        component = _ref[_i];
        _results.push(callback(component));
      }
      return _results;
    };

    Circuit.prototype.isStopped = function() {
      return this.Solver.isStopped;
    };

    Circuit.prototype.timeStep = function() {
      return this.Params.timeStep;
    };

    Circuit.prototype.voltageRange = function() {
      return this.Params.voltageRange;
    };

    Circuit.prototype.powerRange = function() {
      return this.Params.powerRange;
    };

    Circuit.prototype.currentSpeed = function() {
      return this.Params.currentSpeed;
    };

    Circuit.prototype.getState = function() {
      return this.state;
    };

    Circuit.prototype.getStamper = function() {
      return this.Solver.getStamper();
    };

    return Circuit;

  })(Observer);

  module.exports = Circuit;

}).call(this);


},{"../scope/oscilloscope.coffee":10,"../io/logger.coffee":11,"../core/simulationParams.coffee":12,"../engine/circuitSolver.coffee":13,"../util/observer.coffee":14}],13:[function(require,module,exports){
(function() {
  var ArrayUtils, CapacitorElm, CircuitNode, CircuitNodeLink, CircuitSolver, CurrentElm, GroundElm, InductorElm, MatrixStamper, Pathfinder, RailElm, RowInfo, Setting, VoltageElm, WireElm;

  MatrixStamper = require('./matrixStamper.coffee');

  Pathfinder = require('./pathfinder.coffee');

  CircuitNode = require('./circuitNode.coffee');

  CircuitNodeLink = require('./circuitNodeLink.coffee');

  RowInfo = require('./rowInfo.coffee');

  Setting = require('../settings/settings.coffee');

  ArrayUtils = require('../util/ArrayUtils.coffee');

  GroundElm = require('../circuit/components/GroundElm.coffee');

  RailElm = require('../circuit/components/RailElm.coffee');

  VoltageElm = require('../circuit/components/VoltageElm.coffee');

  WireElm = require('../circuit/components/WireElm.coffee');

  CapacitorElm = require('../circuit/components/CapacitorElm.coffee');

  InductorElm = require('../circuit/components/InductorElm.coffee');

  CurrentElm = require('../circuit/components/CurrentElm.coffee');

  CircuitSolver = (function() {
    function CircuitSolver(Circuit) {
      this.Circuit = Circuit;
      this.scaleFactors = ArrayUtils.zeroArray(400);
      this.reset();
      this.Stamper = new MatrixStamper(this.Circuit);
    }

    CircuitSolver.prototype.reset = function() {
      this.Circuit.time = 0;
      this.Circuit.frames = 0;
      this.converged = true;
      this.subIterations = 5000;
      this.circuitMatrix = [];
      this.circuitRightSide = [];
      this.origMatrix = [];
      this.origRightSide = [];
      this.circuitRowInfo = [];
      this.circuitPermute = [];
      this.circuitNonLinear = false;
      this.lastTime = 0;
      this.secTime = 0;
      this.lastFrameTime = 0;
      this.lastIterTime = 0;
      return this.analyzeFlag = true;
    };

    CircuitSolver.prototype._updateTimings = function(lastIterationTime) {
      var currentSpeed, inc, sysTime;
      this.lastIterTime = lastIterationTime;
      sysTime = (new Date()).getTime();
      if (this.lastTime !== 0) {
        inc = Math.floor(sysTime - this.lastTime);
        currentSpeed = Math.exp(this.Circuit.currentSpeed() / 3.5 - 14.2);
        this.Circuit.Params.setCurrentMult(1.7 * inc * currentSpeed);
      }
      if ((sysTime - this.secTime) >= 1000) {
        console.log("Reset!");
        this.frames = 0;
        this.steps = 0;
        this.secTime = sysTime;
      }
      this.lastTime = sysTime;
      return this.lastFrameTime = this.lastTime;
    };

    CircuitSolver.prototype.getStamper = function() {
      return this.Stamper;
    };

    CircuitSolver.prototype.getIterCount = function() {
      var sim_speed;
      sim_speed = 150;
      return 0.1 * Math.exp((sim_speed - 61.0) / 24.0);
    };

    CircuitSolver.prototype.reconstruct = function() {
      var ce, changed, circuitElement, circuitElm, circuitNodeLink, circuitRowInfo, closure, cn, cnl, elt, fpi, gotGround, gotRail, i, ii, internalNodeCount, internalVSCount, j, k, kn, newMatDim, newMatx, newRS, newSize, pathfinder, postCount, postPt, pt, q, qm, qp, qq, qv, re, rowInfo, rowNodeEq, rsadd, tempclosure, volt, voltageSourceCount, vs, _aa, _ab, _ac, _ad, _ae, _i, _j, _k, _l, _len, _len1, _len2, _m, _n, _o, _p, _q, _r, _ref, _ref1, _ref10, _ref11, _ref12, _ref13, _ref14, _ref15, _ref16, _ref17, _ref18, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9, _results, _s, _t, _u, _v, _w, _x, _y, _z;
      if (!this.analyzeFlag || (this.Circuit.numElements() === 0)) {
        return;
      }
      this.Circuit.clearErrors();
      this.Circuit.resetNodes();
      voltageSourceCount = 0;
      gotGround = false;
      gotRail = false;
      volt = null;
      _ref = this.Circuit.getElements();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ce = _ref[_i];
        if (ce instanceof GroundElm) {
          console.log("Found ground");
          gotGround = true;
          break;
        }
        if (ce instanceof RailElm) {
          console.log("Got rail");
          gotRail = true;
        }
        if ((volt == null) && ce instanceof VoltageElm) {
          console.log("Ve");
          volt = ce;
        }
      }
      if (!gotGround && (volt != null) && !gotRail) {
        cn = new CircuitNode();
        pt = volt.getPost(0);
        console.log("GOT GROUND cn=" + cn + ", pt=" + pt);
        cn.x = pt.x;
        cn.y = pt.y;
        this.Circuit.addCircuitNode(cn);
      } else {
        cn = new CircuitNode();
        cn.x = cn.y = -1;
        this.Circuit.addCircuitNode(cn);
      }
      for (i = _j = 0, _ref1 = this.Circuit.numElements(); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        circuitElm = this.Circuit.getElmByIdx(i);
        internalNodeCount = circuitElm.getInternalNodeCount();
        internalVSCount = circuitElm.getVoltageSourceCount();
        postCount = circuitElm.getPostCount();
        for (j = _k = 0; 0 <= postCount ? _k < postCount : _k > postCount; j = 0 <= postCount ? ++_k : --_k) {
          postPt = circuitElm.getPost(j);
          console.log("D: " + circuitElm.dump());
          k = 0;
          while (k < this.Circuit.numNodes()) {
            cn = this.Circuit.getNode(k);
            console.log("j=" + j + "  k=" + k + "  pt=" + postPt + "  " + cn);
            if (postPt.x === cn.x && postPt.y === cn.y) {
              console.log("" + i + " Break!");
              break;
            }
            k++;
          }
          console.log(("NUM NODES: " + i + " ") + this.Circuit.numNodes());
          if (k === this.Circuit.numNodes()) {
            cn = new CircuitNode();
            cn.x = postPt.x;
            cn.y = postPt.y;
            circuitNodeLink = new CircuitNodeLink();
            circuitNodeLink.num = j;
            circuitNodeLink.elm = circuitElm;
            cn.links.push(circuitNodeLink);
            circuitElm.setNode(j, this.Circuit.numNodes());
            this.Circuit.addCircuitNode(cn);
          } else {
            cnl = new CircuitNodeLink();
            cnl.num = j;
            cnl.elm = circuitElm;
            this.Circuit.getNode(k).links.push(cnl);
            circuitElm.setNode(j, k);
            if (k === 0) {
              circuitElm.setNodeVoltage(j, 0);
            }
          }
        }
        for (j = _l = 0; 0 <= internalNodeCount ? _l < internalNodeCount : _l > internalNodeCount; j = 0 <= internalNodeCount ? ++_l : --_l) {
          cn = new CircuitNode(null, null, true);
          cnl = new CircuitNodeLink();
          cnl.num = j + postCount;
          cnl.elm = circuitElm;
          cn.links.push(cnl);
          circuitElm.setNode(cnl.num, this.Circuit.numNodes());
          this.Circuit.addCircuitNode(cn);
        }
        voltageSourceCount += internalVSCount;
      }
      this.Circuit.voltageSources = new Array(voltageSourceCount);
      voltageSourceCount = 0;
      this.circuitNonLinear = false;
      _ref2 = this.Circuit.getElements();
      for (_m = 0, _len1 = _ref2.length; _m < _len1; _m++) {
        circuitElement = _ref2[_m];
        if (circuitElement.nonLinear()) {
          this.circuitNonLinear = true;
        }
        internalVSCount = circuitElement.getVoltageSourceCount();
        for (j = _n = 0; 0 <= internalVSCount ? _n < internalVSCount : _n > internalVSCount; j = 0 <= internalVSCount ? ++_n : --_n) {
          this.Circuit.voltageSources[voltageSourceCount] = circuitElement;
          circuitElement.setVoltageSource(j, voltageSourceCount++);
        }
      }
      this.Circuit.voltageSourceCount = voltageSourceCount;
      this.matrixSize = this.Circuit.numNodes() - 1 + voltageSourceCount;
      this.circuitMatrixSize = this.circuitMatrixFullSize = this.matrixSize;
      this.circuitMatrix = ArrayUtils.zeroArray2(this.matrixSize, this.matrixSize);
      this.origMatrix = ArrayUtils.zeroArray2(this.matrixSize, this.matrixSize);
      this.circuitRightSide = ArrayUtils.zeroArray(this.matrixSize);
      this.origRightSide = ArrayUtils.zeroArray(this.matrixSize);
      this.circuitRowInfo = ArrayUtils.zeroArray(this.matrixSize);
      this.circuitPermute = ArrayUtils.zeroArray(this.matrixSize);
      vs = 0;
      for (i = _o = 0, _ref3 = this.matrixSize; 0 <= _ref3 ? _o < _ref3 : _o > _ref3; i = 0 <= _ref3 ? ++_o : --_o) {
        this.circuitRowInfo[i] = new RowInfo();
      }
      this.circuitNeedsMap = false;
      _ref4 = this.Circuit.getElements();
      for (_p = 0, _len2 = _ref4.length; _p < _len2; _p++) {
        circuitElm = _ref4[_p];
        circuitElm.stamp(this.Stamper);
      }
      closure = new Array(this.Circuit.numNodes());
      tempclosure = new Array(this.Circuit.numNodes());
      closure[0] = true;
      changed = true;
      while (changed) {
        changed = false;
        for (i = _q = 0, _ref5 = this.Circuit.numElements(); 0 <= _ref5 ? _q < _ref5 : _q > _ref5; i = 0 <= _ref5 ? ++_q : --_q) {
          circuitElm = this.Circuit.getElmByIdx(i);
          for (j = _r = 0, _ref6 = circuitElm.getPostCount(); 0 <= _ref6 ? _r < _ref6 : _r > _ref6; j = 0 <= _ref6 ? ++_r : --_r) {
            if (!closure[circuitElm.getNode(j)]) {
              if (circuitElm.hasGroundConnection(j)) {
                changed = true;
                closure[circuitElm.getNode(j)] = true;
              }
              continue;
            }
            for (k = _s = 0, _ref7 = circuitElm.getPostCount(); 0 <= _ref7 ? _s < _ref7 : _s > _ref7; k = 0 <= _ref7 ? ++_s : --_s) {
              if (j === k) {
                continue;
              }
              kn = circuitElm.getNode(k);
              if (circuitElm.getConnection(j, k) && !closure[kn]) {
                closure[kn] = true;
                changed = true;
              }
            }
          }
        }
        if (changed) {
          continue;
        }
        for (i = _t = 0, _ref8 = this.Circuit.numNodes(); 0 <= _ref8 ? _t < _ref8 : _t > _ref8; i = 0 <= _ref8 ? ++_t : --_t) {
          if (!closure[i] && !this.Circuit.nodeList[i].intern) {
            console.warn("Node " + i + " unconnected!");
            this.Stamper.stampResistor(0, i, 1e8);
            closure[i] = true;
            changed = true;
            break;
          }
        }
      }
      for (i = _u = 0, _ref9 = this.Circuit.numElements(); 0 <= _ref9 ? _u < _ref9 : _u > _ref9; i = 0 <= _ref9 ? ++_u : --_u) {
        ce = this.Circuit.getElmByIdx(i);
        if (ce instanceof InductorElm) {
          fpi = new Pathfinder(Pathfinder.INDUCT, ce, ce.getNode(1), this.Circuit.getElements(), this.Circuit.numNodes());
          if (!fpi.findPath(ce.getNode(0), 5) && !fpi.findPath(ce.getNode(0))) {
            ce.reset();
          }
        }
        if (ce instanceof CurrentElm) {
          fpi = new Pathfinder(Pathfinder.INDUCT, ce, ce.getNode(1), this.Circuit.getElements(), this.Circuit.numNodes());
          if (!fpi.findPath(ce.getNode(0))) {
            this.Circuit.halt("No path for current source!", ce);
            return;
          }
        }
        if ((ce instanceof VoltageElm && ce.getPostCount() === 2) || ce instanceof WireElm) {
          console.log("Examining Loop: " + (ce.dump()));
          pathfinder = new Pathfinder(Pathfinder.VOLTAGE, ce, ce.getNode(1), this.Circuit.getElements(), this.Circuit.numNodes());
          if (pathfinder.findPath(ce.getNode(0))) {
            this.Circuit.halt("Voltage source/wire loop with no resistance!", ce);
          }
        }
        if (ce instanceof CapacitorElm) {
          fpi = new Pathfinder(Pathfinder.SHORT, ce, ce.getNode(1), this.Circuit.getElements(), this.Circuit.numNodes());
          if (fpi.findPath(ce.getNode(0))) {
            ce.reset();
          } else {
            fpi = new Pathfinder(Pathfinder.CAP_V, ce, ce.getNode(1), this.Circuit.getElements(), this.Circuit.numNodes());
            if (fpi.findPath(ce.getNode(0))) {
              this.Circuit.halt("Capacitor loop with no resistance!", ce);
              return;
            }
          }
        }
      }
      for (i = _v = 0, _ref10 = this.matrixSize; 0 <= _ref10 ? _v < _ref10 : _v > _ref10; i = 0 <= _ref10 ? ++_v : --_v) {
        qm = -1;
        qp = -1;
        qv = 0;
        re = this.circuitRowInfo[i];
        if (re.lsChanges || re.dropRow || re.rsChanges) {
          continue;
        }
        rsadd = 0;
        for (j = _w = 0, _ref11 = this.matrixSize; 0 <= _ref11 ? _w < _ref11 : _w > _ref11; j = 0 <= _ref11 ? ++_w : --_w) {
          q = this.circuitMatrix[i][j];
          if (this.circuitRowInfo[j].type === RowInfo.ROW_CONST) {
            rsadd -= this.circuitRowInfo[j].value * q;
            continue;
          }
          if (q === 0) {
            continue;
          }
          if (qp === -1) {
            qp = j;
            qv = q;
            continue;
          }
          if (qm === -1 && (q === -qv)) {
            qm = j;
            continue;
          }
          break;
        }
        if (j === this.matrixSize) {
          if (qp === -1) {
            this.Circuit.halt("Matrix error qp (rsadd = " + rsadd + ")", null);
            return;
          }
          elt = this.circuitRowInfo[qp];
          if (qm === -1) {
            k = 0;
            while (elt.type === RowInfo.ROW_EQUAL && k < 100) {
              qp = elt.nodeEq;
              elt = this.circuitRowInfo[qp];
              ++k;
            }
            if (elt.type === RowInfo.ROW_EQUAL) {
              elt.type = RowInfo.ROW_NORMAL;
              continue;
            }
            if (elt.type !== RowInfo.ROW_NORMAL) {
              continue;
            }
            elt.type = RowInfo.ROW_CONST;
            elt.value = (this.circuitRightSide[i] + rsadd) / qv;
            this.circuitRowInfo[i].dropRow = true;
            console.error("iter = 0 # start over from scratch");
            i = -1;
          } else if ((this.circuitRightSide[i] + rsadd) === 0) {
            if (elt.type !== RowInfo.ROW_NORMAL) {
              qq = qm;
              qm = qp;
              qp = qq;
              elt = this.circuitRowInfo[qp];
              if (elt.type !== RowInfo.ROW_NORMAL) {
                console.error("Swap failed!");
                continue;
              }
            }
            elt.type = RowInfo.ROW_EQUAL;
            elt.nodeEq = qm;
            this.circuitRowInfo[i].dropRow = true;
          }
        }
      }
      newMatDim = 0;
      for (i = _x = 0, _ref12 = this.matrixSize; 0 <= _ref12 ? _x < _ref12 : _x > _ref12; i = 0 <= _ref12 ? ++_x : --_x) {
        rowInfo = this.circuitRowInfo[i];
        if (rowInfo.type === RowInfo.ROW_NORMAL) {
          rowInfo.mapCol = newMatDim++;
          continue;
        }
        if (rowInfo.type === RowInfo.ROW_EQUAL) {
          while (j !== (function() {
              _results = [];
              for (_y = 0; _y < 100; _y++){ _results.push(_y); }
              return _results;
            }).apply(this)) {
            rowNodeEq = this.circuitRowInfo[rowInfo.nodeEq];
            if (rowNodeEq.type !== RowInfo.ROW_EQUAL) {
              break;
            }
            if (i === rowNodeEq.nodeEq) {
              break;
            }
            rowInfo.nodeEq = rowNodeEq.nodeEq;
          }
        }
        if (rowInfo.type === RowInfo.ROW_CONST) {
          rowInfo.mapCol = -1;
        }
      }
      for (i = _z = 0, _ref13 = this.matrixSize; 0 <= _ref13 ? _z < _ref13 : _z > _ref13; i = 0 <= _ref13 ? ++_z : --_z) {
        rowInfo = this.circuitRowInfo[i];
        if (rowInfo.type === RowInfo.ROW_EQUAL) {
          rowNodeEq = this.circuitRowInfo[rowInfo.nodeEq];
          if (rowNodeEq.type === RowInfo.ROW_CONST) {
            rowInfo.type = rowNodeEq.type;
            rowInfo.value = rowNodeEq.value;
            rowInfo.mapCol = -1;
          } else {
            rowInfo.mapCol = rowNodeEq.mapCol;
          }
        }
      }
      newSize = newMatDim;
      newMatx = ArrayUtils.zeroArray2(newSize, newSize);
      newRS = new Array(newSize);
      ArrayUtils.zeroArray(newRS);
      ii = 0;
      for (i = _aa = 0, _ref14 = this.matrixSize; 0 <= _ref14 ? _aa < _ref14 : _aa > _ref14; i = 0 <= _ref14 ? ++_aa : --_aa) {
        circuitRowInfo = this.circuitRowInfo[i];
        if (circuitRowInfo.dropRow) {
          circuitRowInfo.mapRow = -1;
          continue;
        }
        newRS[ii] = this.circuitRightSide[i];
        circuitRowInfo.mapRow = ii;
        for (j = _ab = 0, _ref15 = this.matrixSize; 0 <= _ref15 ? _ab < _ref15 : _ab > _ref15; j = 0 <= _ref15 ? ++_ab : --_ab) {
          rowInfo = this.circuitRowInfo[j];
          if (rowInfo.type === RowInfo.ROW_CONST) {
            newRS[ii] -= rowInfo.value * this.circuitMatrix[i][j];
          } else {
            newMatx[ii][rowInfo.mapCol] += this.circuitMatrix[i][j];
          }
        }
        ii++;
      }
      this.circuitMatrix = newMatx;
      this.circuitRightSide = newRS;
      this.matrixSize = this.circuitMatrixSize = newSize;
      for (i = _ac = 0, _ref16 = this.matrixSize; 0 <= _ref16 ? _ac < _ref16 : _ac > _ref16; i = 0 <= _ref16 ? ++_ac : --_ac) {
        this.origRightSide[i] = this.circuitRightSide[i];
      }
      for (i = _ad = 0, _ref17 = this.matrixSize; 0 <= _ref17 ? _ad < _ref17 : _ad > _ref17; i = 0 <= _ref17 ? ++_ad : --_ad) {
        for (j = _ae = 0, _ref18 = this.matrixSize; 0 <= _ref18 ? _ae < _ref18 : _ae > _ref18; j = 0 <= _ref18 ? ++_ae : --_ae) {
          this.origMatrix[i][j] = this.circuitMatrix[i][j];
        }
      }
      this.circuitNeedsMap = true;
      this.analyzeFlag = false;
      if (!this.circuitNonLinear) {
        if (!this.luFactor(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute)) {
          this.Circuit.halt("Singular matrix in linear circuit!", null);
        }
      }
    };

    CircuitSolver.prototype.solveCircuit = function() {
      var circuitElm, circuitNode, cn1, debugPrint, i, iter, j, ji, lit, res, rowInfo, stepRate, subiter, subiterCount, tm, _i, _j, _k, _l, _len, _len1, _len2, _m, _n, _o, _p, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
      this.sysTime = (new Date()).getTime();
      if ((this.circuitMatrix == null) || this.Circuit.numElements() === 0) {
        this.circuitMatrix = null;
        return;
      }
      debugPrint = this.dumpMatrix;
      this.dumpMatrix = false;
      stepRate = Math.floor(160 * this.getIterCount());
      tm = (new Date()).getTime();
      lit = this.lastIterTime;
      if (1000 >= stepRate * (tm - this.lastIterTime)) {
        return;
      }
      iter = 1;
      while (true) {
        _ref = this.Circuit.getElements();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          circuitElm = _ref[_i];
          circuitElm.startIteration();
        }
        ++this.steps;
        subiterCount = 5000;
        for (subiter = _j = 0; 0 <= subiterCount ? _j < subiterCount : _j > subiterCount; subiter = 0 <= subiterCount ? ++_j : --_j) {
          this.converged = true;
          this.subIterations = subiter;
          for (i = _k = 0, _ref1 = this.circuitMatrixSize; 0 <= _ref1 ? _k < _ref1 : _k > _ref1; i = 0 <= _ref1 ? ++_k : --_k) {
            this.circuitRightSide[i] = this.origRightSide[i];
          }
          if (this.circuitNonLinear) {
            for (i = _l = 0, _ref2 = this.circuitMatrixSize; 0 <= _ref2 ? _l < _ref2 : _l > _ref2; i = 0 <= _ref2 ? ++_l : --_l) {
              for (j = _m = 0, _ref3 = this.circuitMatrixSize; 0 <= _ref3 ? _m < _ref3 : _m > _ref3; j = 0 <= _ref3 ? ++_m : --_m) {
                this.circuitMatrix[i][j] = this.origMatrix[i][j];
              }
            }
          }
          _ref4 = this.Circuit.getElements();
          for (_n = 0, _len1 = _ref4.length; _n < _len1; _n++) {
            circuitElm = _ref4[_n];
            circuitElm.doStep(this.Stamper);
          }
          if (this.stopMessage != null) {
            return;
          }
          debugPrint = false;
          if (this.circuitNonLinear) {
            if (this.converged && subiter > 0) {
              break;
            }
            if (!this.luFactor(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute)) {
              this.Circuit.halt("Singular matrix in nonlinear circuit!", null);
              return;
            }
          }
          this.luSolve(this.circuitMatrix, this.circuitMatrixSize, this.circuitPermute, this.circuitRightSide);
          for (j = _o = 0, _ref5 = this.circuitMatrixFullSize; 0 <= _ref5 ? _o < _ref5 : _o > _ref5; j = 0 <= _ref5 ? ++_o : --_o) {
            rowInfo = this.circuitRowInfo[j];
            res = 0;
            if (rowInfo.type === RowInfo.ROW_CONST) {
              res = rowInfo.value;
            } else {
              res = this.circuitRightSide[rowInfo.mapCol];
            }
            if (isNaN(res)) {
              this.converged = false;
              break;
            }
            if (j < (this.Circuit.numNodes() - 1)) {
              circuitNode = this.Circuit.nodeList[j + 1];
              _ref6 = circuitNode.links;
              for (_p = 0, _len2 = _ref6.length; _p < _len2; _p++) {
                cn1 = _ref6[_p];
                cn1.elm.setNodeVoltage(cn1.num, res);
              }
            } else {
              ji = j - (this.Circuit.numNodes() - 1);
              this.Circuit.voltageSources[ji].setCurrent(ji, res);
            }
          }
          if (!this.circuitNonLinear) {
            break;
          }
          subiter++;
        }
        if (subiter > 5) {
          console.log("converged after " + subiter + " iterations\n");
        }
        if (subiter >= subiterCount) {
          this.halt("Convergence failed: " + subiter, null);
          break;
        }
        this.Circuit.time += this.Circuit.timeStep();
        tm = (new Date()).getTime();
        lit = tm;
        if (iter * 1000 >= stepRate * (tm - this.lastIterTime)) {
          break;
        } else if ((tm - this.lastFrameTime) > 500) {
          break;
        }
        ++iter;
      }
      this.frames++;
      this.Circuit.iterations++;
      return this._updateTimings(lit);
    };

    /*
      luFactor: finds a solution to a factored matrix through LU (Lower-Upper) factorization
    
      Called once each frame for resistive circuits, otherwise called many times each frame
    
      @param circuitMatrix 2D matrix to be solved
      @param matrixSize number or rows/columns in the matrix
      @param pivotArray pivot index
    */


    CircuitSolver.prototype.luFactor = function(circuitMatrix, matrixSize, pivotArray) {
      var i, j, k, largest, largestRow, matrix_ij, mult, x;
      i = 0;
      while (i < matrixSize) {
        largest = 0;
        j = 0;
        while (j < matrixSize) {
          x = Math.abs(circuitMatrix[i][j]);
          if (x > largest) {
            largest = x;
          }
          ++j;
        }
        if (largest === 0) {
          return false;
        }
        this.scaleFactors[i] = 1.0 / largest;
        ++i;
      }
      j = 0;
      while (j < matrixSize) {
        i = 0;
        while (i < j) {
          matrix_ij = circuitMatrix[i][j];
          k = 0;
          while (k !== i) {
            matrix_ij -= circuitMatrix[i][k] * circuitMatrix[k][j];
            ++k;
          }
          circuitMatrix[i][j] = matrix_ij;
          ++i;
        }
        largest = 0;
        largestRow = -1;
        i = j;
        while (i < matrixSize) {
          matrix_ij = circuitMatrix[i][j];
          k = 0;
          while (k < j) {
            matrix_ij -= circuitMatrix[i][k] * circuitMatrix[k][j];
            ++k;
          }
          circuitMatrix[i][j] = matrix_ij;
          x = Math.abs(matrix_ij);
          if (x >= largest) {
            largest = x;
            largestRow = i;
          }
          ++i;
        }
        if (j !== largestRow) {
          k = 0;
          while (k < matrixSize) {
            x = circuitMatrix[largestRow][k];
            circuitMatrix[largestRow][k] = circuitMatrix[j][k];
            circuitMatrix[j][k] = x;
            ++k;
          }
          this.scaleFactors[largestRow] = this.scaleFactors[j];
        }
        pivotArray[j] = largestRow;
        if (circuitMatrix[j][j] === 0) {
          circuitMatrix[j][j] = 1e-18;
        }
        if (j !== matrixSize - 1) {
          mult = 1 / circuitMatrix[j][j];
          i = j + 1;
          while (i !== matrixSize) {
            circuitMatrix[i][j] *= mult;
            ++i;
          }
        }
        ++j;
      }
      return true;
    };

    /*
      Step 2: `lu_solve`: (Called by lu_factor)
      finds a solution to a factored matrix through LU (Lower-Upper) factorization
    
      Called once each frame for resistive circuits, otherwise called many times each frame
    
      @param circuitMatrix matrix to be solved
      @param numRows dimension
      @param pivotVector pivot index
      @param circuitRightSide Right-side (dependent) matrix
    */


    CircuitSolver.prototype.luSolve = function(circuitMatrix, numRows, pivotVector, circuitRightSide) {
      var bi, i, j, row, swap, tot, total, _results;
      i = 0;
      while (i < numRows) {
        row = pivotVector[i];
        swap = circuitRightSide[row];
        circuitRightSide[row] = circuitRightSide[i];
        circuitRightSide[i] = swap;
        if (swap !== 0) {
          break;
        }
        ++i;
      }
      bi = i++;
      while (i < numRows) {
        row = pivotVector[i];
        tot = circuitRightSide[row];
        circuitRightSide[row] = circuitRightSide[i];
        j = bi;
        while (j < i) {
          tot -= circuitMatrix[i][j] * circuitRightSide[j];
          ++j;
        }
        circuitRightSide[i] = tot;
        ++i;
      }
      i = numRows - 1;
      _results = [];
      while (i >= 0) {
        total = circuitRightSide[i];
        j = i + 1;
        while (j !== numRows) {
          total -= circuitMatrix[i][j] * circuitRightSide[j];
          ++j;
        }
        circuitRightSide[i] = total / circuitMatrix[i][i];
        _results.push(i--);
      }
      return _results;
    };

    return CircuitSolver;

  })();

  module.exports = CircuitSolver;

}).call(this);


},{"./matrixStamper.coffee":40,"./pathfinder.coffee":41,"./circuitNode.coffee":42,"./circuitNodeLink.coffee":43,"./rowInfo.coffee":44,"../settings/settings.coffee":17,"../util/ArrayUtils.coffee":45,"../circuit/components/GroundElm.coffee":22,"../circuit/components/RailElm.coffee":31,"../circuit/components/VoltageElm.coffee":23,"../circuit/components/WireElm.coffee":20,"../circuit/components/CapacitorElm.coffee":27,"../circuit/components/InductorElm.coffee":28,"../circuit/components/CurrentElm.coffee":30}],15:[function(require,module,exports){
(function() {
  var ArrayUtils, CircuitComponent, DrawHelper, MathUtils, Point, Rectangle, Settings,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Settings = require('../settings/settings.coffee');

  DrawHelper = require('../render/drawHelper.coffee');

  Rectangle = require('../geom/rectangle.coffee');

  Point = require('../geom/point.coffee');

  MathUtils = require('../util/mathUtils.coffee');

  ArrayUtils = require('../util/arrayUtils.coffee');

  CircuitComponent = (function() {
    function CircuitComponent(x1, y1, x2, y2, flags, st) {
      this.x1 = x1 != null ? x1 : 100;
      this.y1 = y1 != null ? y1 : 100;
      this.x2 = x2 != null ? x2 : 100;
      this.y2 = y2 != null ? y2 : 200;
      if (flags == null) {
        flags = 0;
      }
      if (st == null) {
        st = [];
      }
      this.drawDots = __bind(this.drawDots, this);
      this.destroy = __bind(this.destroy, this);
      this.current = 0;
      this.curcount = 0;
      this.noDiagonal = false;
      this.selected = false;
      this.dragging = false;
      this.parentCircuit = null;
      this.focused = false;
      this.flags = flags || this.getDefaultFlags();
      this.setPoints();
      this.allocNodes();
      this.initBoundingBox();
      this.component_id = MathUtils.getRand(100000000) + (new Date()).getTime();
    }

    CircuitComponent.prototype.getParentCircuit = function() {
      return this.Circuit;
    };

    CircuitComponent.prototype.isBeingDragged = function() {
      return this.dragging;
    };

    CircuitComponent.prototype.beingDragged = function(dragging) {
      return this.dragging = dragging;
    };

    CircuitComponent.prototype.allocNodes = function() {
      this.nodes = ArrayUtils.zeroArray(this.getPostCount() + this.getInternalNodeCount());
      return this.volts = ArrayUtils.zeroArray(this.getPostCount() + this.getInternalNodeCount());
    };

    CircuitComponent.prototype.setPoints = function() {
      this.dx = this.x2 - this.x1;
      this.dy = this.y2 - this.y1;
      this.dn = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
      this.dpx1 = this.dy / this.dn;
      this.dpy1 = -this.dx / this.dn;
      this.dsign = (this.dy === 0 ? MathUtils.sign(this.dx) : MathUtils.sign(this.dy));
      this.point1 = new Point(this.x1, this.y1);
      return this.point2 = new Point(this.x2, this.y2);
    };

    CircuitComponent.prototype.setPowerColor = function(color) {
      return console.warn("Set power color not yet implemented");
    };

    CircuitComponent.prototype.getDumpType = function() {
      return 0;
    };

    CircuitComponent.prototype.reset = function() {
      this.volts = ArrayUtils.zeroArray(this.volts.length);
      return this.curcount = 0;
    };

    CircuitComponent.prototype.setCurrent = function(x, current) {
      return this.current = current;
    };

    CircuitComponent.prototype.getCurrent = function() {
      return this.current;
    };

    CircuitComponent.prototype.getVoltageDiff = function() {
      return this.volts[0] - this.volts[1];
    };

    CircuitComponent.prototype.getPower = function() {
      return this.getVoltageDiff() * this.current;
    };

    CircuitComponent.prototype.calculateCurrent = function() {};

    CircuitComponent.prototype.doStep = function() {};

    CircuitComponent.prototype.orphaned = function() {
      return this.Circuit === null || this.Circuit === void 0;
    };

    CircuitComponent.prototype.destroy = function() {
      return this.Circuit.desolder(this);
    };

    CircuitComponent.prototype.startIteration = function() {};

    CircuitComponent.prototype.getPostVoltage = function(post_idx) {
      return this.volts[post_idx];
    };

    CircuitComponent.prototype.setNodeVoltage = function(node_idx, voltage) {
      this.volts[node_idx] = voltage;
      return this.calculateCurrent();
    };

    CircuitComponent.prototype.calcLeads = function(len) {
      if (this.dn < len || len === 0) {
        this.lead1 = this.point1;
        this.lead2 = this.point2;
        console.log("Len: " + len);
        return;
      }
      this.lead1 = DrawHelper.interpPoint(this.point1, this.point2, (this.dn - len) / (2 * this.dn));
      return this.lead2 = DrawHelper.interpPoint(this.point1, this.point2, (this.dn + len) / (2 * this.dn));
    };

    CircuitComponent.prototype.updateDotCount = function(cur, cc) {
      var cadd;
      if (isNaN(cur) || (cur == null)) {
        cur = this.current;
      }
      if (isNaN(cc) || (cc == null)) {
        cc = this.curcount;
      }
      cadd = cur * this.Circuit.Params.getCurrentMult();
      cadd %= 8;
      this.curcount = cc + cadd;
      return this.curcount;
    };

    CircuitComponent.prototype.getDefaultFlags = function() {
      return 0;
    };

    CircuitComponent.prototype.equal_to = function(otherComponent) {
      return this.component_id === otherComponent.component_id;
    };

    CircuitComponent.prototype.drag = function(newX, newY) {
      newX = this.Circuit.snapGrid(newX);
      newY = this.Circuit.snapGrid(newY);
      if (this.noDiagonal) {
        if (Math.abs(this.x1 - newX) < Math.abs(this.y1 - newY)) {
          newX = this.x1;
        } else {
          newY = this.y1;
        }
      }
      this.x2 = newX;
      this.y2 = newY;
      return this.setPoints();
    };

    CircuitComponent.prototype.move = function(deltaX, deltaY) {
      this.x1 += deltaX;
      this.y1 += deltaY;
      this.x2 += deltaX;
      this.y2 += deltaY;
      this.boundingBox.x += deltaX;
      this.boundingBox.y += deltaY;
      return this.setPoints();
    };

    CircuitComponent.prototype.allowMove = function(deltaX, deltaY) {
      var circuitElm, newX, newX2, newY, newY2, _i, _len, _ref;
      newX = this.x1 + deltaX;
      newY = this.y1 + deltaY;
      newX2 = this.x2 + deltaX;
      newY2 = this.y2 + deltaY;
      _ref = this.Circuit.elementList;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        circuitElm = _ref[_i];
        if (circuitElm.x1 === newX && circuitElm.y1 === newY && circuitElm.x2 === newX2 && circuitElm.y2 === newY2) {
          return false;
        }
        if (circuitElm.x1 === newX2 && circuitElm.y1 === newY2 && circuitElm.x2 === newX && circuitElm.y2 === newY) {
          return false;
        }
      }
      return true;
    };

    CircuitComponent.prototype.movePoint = function(n, deltaX, deltaY) {
      if (n === 0) {
        this.x1 += deltaX;
        this.y1 += deltaY;
      } else {
        this.x2 += deltaX;
        this.y2 += deltaY;
      }
      return this.setPoints();
    };

    CircuitComponent.prototype.stamp = function() {
      throw "Called abstract function stamp() in Circuit " + (this.getDumpType());
    };

    CircuitComponent.prototype.getDumpClass = function() {
      return this.toString();
    };

    CircuitComponent.prototype.toString = function() {
      return console.error("Virtual call on toString in circuitComponent was " + (this.dump()));
    };

    CircuitComponent.prototype.dump = function() {
      return this.getDumpType() + " " + this.x1 + " " + this.y1 + " " + this.x2 + " " + this.y2 + " " + this.flags;
    };

    CircuitComponent.prototype.getVoltageSourceCount = function() {
      return 0;
    };

    CircuitComponent.prototype.getInternalNodeCount = function() {
      return 0;
    };

    CircuitComponent.prototype.setNode = function(nodeIdx, newValue) {
      return this.nodes[nodeIdx] = newValue;
    };

    CircuitComponent.prototype.setVoltageSource = function(node, value) {
      return this.voltSource = value;
    };

    CircuitComponent.prototype.getVoltageSource = function() {
      return this.voltSource;
    };

    CircuitComponent.prototype.nonLinear = function() {
      return false;
    };

    CircuitComponent.prototype.getPostCount = function() {
      return 2;
    };

    CircuitComponent.prototype.getNode = function(nodeIdx) {
      return this.nodes[nodeIdx];
    };

    CircuitComponent.prototype.getPost = function(postIdx) {
      if (postIdx === 0) {
        return this.point1;
      } else if (postIdx === 1) {
        return this.point2;
      }
      return console.printStackTrace();
    };

    CircuitComponent.prototype.getBoundingBox = function() {
      return this.boundingBox;
    };

    CircuitComponent.prototype.initBoundingBox = function() {
      this.boundingBox = new Rectangle();
      this.boundingBox.x = Math.min(this.x1, this.x2);
      this.boundingBox.y = Math.min(this.y1, this.y2);
      this.boundingBox.width = Math.abs(this.x2 - this.x1) + 1;
      return this.boundingBox.height = Math.abs(this.y2 - this.y1) + 1;
    };

    CircuitComponent.prototype.setBbox = function(x1, y1, x2, y2) {
      var temp;
      if (x1 > x2) {
        temp = x1;
        x1 = x2;
        x2 = temp;
      }
      if (y1 > y2) {
        temp = y1;
        y1 = y2;
        y2 = temp;
      }
      this.boundingBox.x = x1;
      this.boundingBox.y = y1;
      this.boundingBox.width = x2 - x1 + 1;
      return this.boundingBox.height = y2 - y1 + 1;
    };

    CircuitComponent.prototype.setBboxPt = function(p1, p2, width) {
      var deltaX, deltaY;
      this.setBbox(p1.x, p1.y, p2.x, p2.y);
      deltaX = this.dpx1 * width;
      deltaY = this.dpy1 * width;
      return this.adjustBbox(p1.x + deltaX, p1.y + deltaY, p1.x - deltaX, p1.y - deltaY);
    };

    CircuitComponent.prototype.adjustBbox = function(x1, y1, x2, y2) {
      var q;
      if (x1 > x2) {
        q = x1;
        x1 = x2;
        x2 = q;
      }
      if (y1 > y2) {
        q = y1;
        y1 = y2;
        y2 = q;
      }
      x1 = Math.min(this.boundingBox.x, x1);
      y1 = Math.min(this.boundingBox.y, y1);
      x2 = Math.max(this.boundingBox.x + this.boundingBox.width - 1, x2);
      y2 = Math.max(this.boundingBox.y + this.boundingBox.height - 1, y2);
      this.boundingBox.x = x1;
      this.boundingBox.y = y1;
      this.boundingBox.width = x2 - x1;
      return this.boundingBox.height = y2 - y1;
    };

    CircuitComponent.prototype.adjustBboxPt = function(p1, p2) {
      return this.adjustBbox(p1.x, p1.y, p2.x, p2.y);
    };

    CircuitComponent.prototype.isCenteredText = function() {
      return false;
    };

    CircuitComponent.prototype.getInfo = function(arr) {
      return arr = new Array(15);
    };

    CircuitComponent.prototype.getEditInfo = function(n) {
      throw new Error("Called abstract function getEditInfo() in AbstractCircuitElement");
    };

    CircuitComponent.prototype.setEditValue = function(n, ei) {
      throw new Error("Called abstract function setEditInfo() in AbstractCircuitElement");
    };

    CircuitComponent.prototype.getBasicInfo = function(arr) {
      arr[1] = "I = " + DrawHelper.getCurrentDText(this.getCurrent());
      arr[2] = "Vd = " + DrawHelper.getVoltageDText(this.getVoltageDiff());
      return 3;
    };

    CircuitComponent.prototype.getScopeValue = function(x) {
      if (x === 1) {
        return this.getPower();
      } else {
        return this.getVoltageDiff();
      }
    };

    CircuitComponent.getScopeUnits = function(x) {
      if (x === 1) {
        return "W";
      } else {
        return "V";
      }
    };

    CircuitComponent.prototype.getConnection = function(n1, n2) {
      return true;
    };

    CircuitComponent.prototype.hasGroundConnection = function(n1) {
      return false;
    };

    CircuitComponent.prototype.isWire = function() {
      return false;
    };

    CircuitComponent.prototype.canViewInScope = function() {
      return this.getPostCount() <= 2;
    };

    CircuitComponent.prototype.needsHighlight = function() {
      return this.focused;
    };

    CircuitComponent.prototype.setSelected = function(selected) {
      return this.selected = selected;
    };

    CircuitComponent.prototype.isSelected = function() {
      return this.selected;
    };

    CircuitComponent.prototype.needsShortcut = function() {
      return false;
    };

    /**/


    /**/


    CircuitComponent.prototype.draw = function(renderContext) {
      this.curcount = this.updateDotCount();
      this.drawPosts(renderContext);
      return this.draw2Leads(renderContext);
    };

    CircuitComponent.prototype.draw2Leads = function(renderContext) {
      if ((this.point1 != null) && (this.lead1 != null)) {
        renderContext.drawThickLinePt(this.point1, this.lead1, DrawHelper.getVoltageColor(this.volts[0]));
      }
      if ((this.point2 != null) && (this.lead2 != null)) {
        return renderContext.drawThickLinePt(this.lead2, this.point2, DrawHelper.getVoltageColor(this.volts[1]));
      }
    };

    CircuitComponent.prototype.drawDots = function(point1, point2, renderContext) {
      var currentIncrement, dn, ds, dx, dy, newPos, x0, y0, _ref, _results;
      if (point1 == null) {
        point1 = this.point1;
      }
      if (point2 == null) {
        point2 = this.point2;
      }
      if (((_ref = this.Circuit) != null ? _ref.isStopped() : void 0) || this.current === 0) {
        return;
      }
      dx = point2.x - point1.x;
      dy = point2.y - point1.y;
      dn = Math.sqrt(dx * dx + dy * dy);
      ds = 16;
      currentIncrement = this.current * this.Circuit.currentSpeed();
      this.curcount = (this.curcount + currentIncrement) % ds;
      if (this.curcount < 0) {
        this.curcount += ds;
      }
      newPos = this.curcount;
      _results = [];
      while (newPos < dn) {
        x0 = point1.x + newPos * dx / dn;
        y0 = point1.y + newPos * dy / dn;
        renderContext.fillCircle(x0, y0, Settings.CURRENT_RADIUS);
        _results.push(newPos += ds);
      }
      return _results;
    };

    /*
    Todo: Not yet implemented
    */


    CircuitComponent.prototype.drawCenteredText = function(text, x, y, doCenter, renderContext) {
      var ascent, descent, strWidth;
      strWidth = 10 * text.length;
      if (doCenter) {
        x -= strWidth / 2;
      }
      ascent = -10;
      descent = 5;
      renderContext.fillStyle = Settings.TEXT_COLOR;
      renderContext.fillText(text, x, y + ascent);
      this.adjustBbox(x, y - ascent, x + strWidth, y + ascent + descent);
      return text;
    };

    /*
    # Draws relevant values near components
    #  e.g. 500 Ohms, 10V, etc...
    */


    CircuitComponent.prototype.drawValues = function(valueText, hs, renderContext) {
      var dpx, dpy, offset, stringWidth, xc, xx, ya, yc;
      if (!valueText) {
        return;
      }
      stringWidth = 100;
      ya = -10;
      xc = (this.x2 + this.x1) / 2;
      yc = (this.y2 + this.y1) / 2;
      dpx = Math.floor(this.dpx1 * hs);
      dpy = Math.floor(this.dpy1 * hs);
      offset = 20;
      renderContext.fillStyle = Settings.TEXT_COLOR;
      if (dpx === 0) {
        return renderContext.fillText(valueText, xc - stringWidth / 2 + 3 * offset / 2, yc - Math.abs(dpy) - offset / 3);
      } else {
        xx = xc + Math.abs(dpx) + offset;
        return renderContext.fillText(valueText, xx, yc + dpy + ya);
      }
    };

    CircuitComponent.prototype.drawPosts = function(renderContext) {
      var i, post, _i, _ref, _results;
      _results = [];
      for (i = _i = 0, _ref = this.getPostCount(); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        post = this.getPost(i);
        _results.push(this.drawPost(post.x, post.y, this.nodes[i], renderContext));
      }
      return _results;
    };

    CircuitComponent.prototype.drawPost = function(x0, y0, node, renderContext) {
      var fillColor, strokeColor;
      if (this.needsHighlight()) {
        fillColor = Settings.POST_COLOR_SELECTED;
        strokeColor = Settings.POST_COLOR_SELECTED;
      } else {
        fillColor = Settings.POST_COLOR;
        strokeColor = Settings.POST_COLOR;
      }
      return renderContext.fillCircle(x0, y0, Settings.POST_RADIUS, 1, fillColor, strokeColor);
    };

    CircuitComponent.newPointArray = function(n) {
      var a;
      a = new Array(n);
      while (n > 0) {
        a[--n] = new Point(0, 0);
      }
      return a;
    };

    CircuitComponent.prototype.comparePair = function(x1, x2, y1, y2) {
      (x1 === y1 && x2 === y2) || (x1 === y2 && x2 === y1);
      return this.Circuit.Params;
    };

    CircuitComponent.prototype.timeStep = function() {
      return this.Circuit.timeStep();
    };

    module.exports = CircuitComponent;

    return CircuitComponent;

  })();

}).call(this);


},{"../settings/settings.coffee":17,"../render/drawHelper.coffee":46,"../geom/rectangle.coffee":18,"../geom/point.coffee":47,"../util/mathUtils.coffee":48,"../util/arrayUtils.coffee":49}],42:[function(require,module,exports){
(function() {
  var CircuitNode;

  CircuitNode = (function() {
    function CircuitNode(x, y, intern, links) {
      this.x = x != null ? x : 0;
      this.y = y != null ? y : 0;
      this.intern = intern != null ? intern : false;
      this.links = links != null ? links : [];
    }

    CircuitNode.prototype.toString = function() {
      return "CircuitNode: " + this.x + " " + this.y + " " + this.intern + " [" + (this.links.toString()) + "]";
    };

    return CircuitNode;

  })();

  module.exports = CircuitNode;

}).call(this);


},{}],43:[function(require,module,exports){
(function() {
  var CircuitNodeLink;

  CircuitNodeLink = (function() {
    function CircuitNodeLink(num, elm) {
      this.num = num != null ? num : 0;
      this.elm = elm != null ? elm : null;
    }

    CircuitNodeLink.prototype.toString = function() {
      return "" + this.num + " " + (this.elm.toString());
    };

    return CircuitNodeLink;

  })();

  module.exports = CircuitNodeLink;

}).call(this);


},{}],44:[function(require,module,exports){
(function() {
  var RowInfo;

  RowInfo = (function() {
    RowInfo.ROW_NORMAL = 0;

    RowInfo.ROW_CONST = 1;

    RowInfo.ROW_EQUAL = 2;

    function RowInfo() {
      this.type = RowInfo.ROW_NORMAL;
      this.nodeEq = 0;
      this.mapCol = 0;
      this.mapRow = 0;
      this.value = 0;
      this.rsChanges = false;
      this.lsChanges = false;
      this.dropRow = false;
    }

    RowInfo.prototype.toString = function() {
      return "RowInfo: type: " + this.type + ", nodeEq: " + this.nodeEq + ", mapCol: " + this.mapCol + ", mapRow: " + this.mapRow + ", value: " + this.value + ", rsChanges: " + this.rsChanges + ", lsChanges: " + this.lsChanges + ", dropRow: " + this.dropRow;
    };

    return RowInfo;

  })();

  module.exports = RowInfo;

}).call(this);


},{}],45:[function(require,module,exports){
(function() {
  var ArrayUtils;

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchItem, i) {
      if (i == null) {
        i = 0;
      }
      while (i < this.length) {
        if (this[i] === searchItem) {
          return i;
        }
        ++i;
      }
      return -1;
    };
  }

  Array.prototype.remove = function() {
    var args, ax, item, num_args;
    args = arguments;
    num_args = args.length;
    while (num_args && this.length) {
      item = args[--num_args];
      while ((ax = this.indexOf(item)) !== -1) {
        this.splice(ax, 1);
      }
    }
    return this;
  };

  ArrayUtils = (function() {
    function ArrayUtils() {}

    ArrayUtils.zeroArray = function(numElements) {
      var i;
      if (numElements < 1) {
        return [];
      }
      return (function() {
        var _i, _len, _ref, _results;
        _ref = Array(numElements);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(0);
        }
        return _results;
      })();
    };

    ArrayUtils.zeroArray2 = function(numRows, numCols) {
      var i, _i, _len, _ref, _results;
      if (numRows < 1) {
        return [];
      }
      _ref = Array(numRows);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        i = _ref[_i];
        _results.push(this.zeroArray(numCols));
      }
      return _results;
    };

    ArrayUtils.isCleanArray = function(arr) {
      var element, valid, _i, _len;
      for (_i = 0, _len = arr.length; _i < _len; _i++) {
        element = arr[_i];
        if (element instanceof Array) {
          valid = arguments.callee(element);
        } else {
          if (!isFinite(element)) {
            console.warn("Invalid number found: " + element);
            console.printStackTrace();
            return false;
          }
        }
      }
    };

    ArrayUtils.printArray = function(arr) {
      var subarr, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = arr.length; _i < _len; _i++) {
        subarr = arr[_i];
        _results.push(console.log(subarr));
      }
      return _results;
    };

    return ArrayUtils;

  })();

  module.exports = ArrayUtils;

}).call(this);


},{}],47:[function(require,module,exports){
(function() {
  var Point;

  Point = (function() {
    function Point(x, y) {
      this.x = x != null ? x : 0;
      this.y = y != null ? y : 0;
    }

    Point.prototype.equals = function(otherPoint) {
      return this.x === otherPoint.x && this.y === otherPoint.y;
    };

    Point.toArray = function(num) {
      var i, _i, _len, _ref, _results;
      _ref = Array(num);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        i = _ref[_i];
        _results.push(new Point(0, 0));
      }
      return _results;
    };

    Point.comparePair = function(x1, x2, y1, y2) {
      return (x1 === y1 && x2 === y2) || (x1 === y2 && x2 === y1);
    };

    Point.distanceSq = function(x1, y1, x2, y2) {
      x2 -= x1;
      y2 -= y1;
      return x2 * x2 + y2 * y2;
    };

    Point.prototype.toString = function() {
      return "[\t" + this.x + ", \t" + this.y + "]";
    };

    return Point;

  })();

  module.exports = Point;

}).call(this);


},{}],48:[function(require,module,exports){
(function() {
  var MathUtils;

  MathUtils = (function() {
    function MathUtils() {}

    MathUtils.isInfinite = function(num) {
      return num > 1e18 || !isFinite(num);
    };

    MathUtils.sign = function(x) {
      if (x < 0) {
        return -1;
      } else if (x === 0) {
        return 0;
      } else {
        return 1;
      }
    };

    MathUtils.getRand = function(x) {
      return Math.floor(Math.random() * (x + 1));
    };

    return MathUtils;

  })();

  module.exports = MathUtils;

}).call(this);


},{}],49:[function(require,module,exports){
(function() {
  var ArrayUtils;

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchItem, i) {
      if (i == null) {
        i = 0;
      }
      while (i < this.length) {
        if (this[i] === searchItem) {
          return i;
        }
        ++i;
      }
      return -1;
    };
  }

  Array.prototype.remove = function() {
    var args, ax, item, num_args;
    args = arguments;
    num_args = args.length;
    while (num_args && this.length) {
      item = args[--num_args];
      while ((ax = this.indexOf(item)) !== -1) {
        this.splice(ax, 1);
      }
    }
    return this;
  };

  ArrayUtils = (function() {
    function ArrayUtils() {}

    ArrayUtils.zeroArray = function(numElements) {
      var i;
      if (numElements < 1) {
        return [];
      }
      return (function() {
        var _i, _len, _ref, _results;
        _ref = Array(numElements);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(0);
        }
        return _results;
      })();
    };

    ArrayUtils.zeroArray2 = function(numRows, numCols) {
      var i, _i, _len, _ref, _results;
      if (numRows < 1) {
        return [];
      }
      _ref = Array(numRows);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        i = _ref[_i];
        _results.push(this.zeroArray(numCols));
      }
      return _results;
    };

    ArrayUtils.isCleanArray = function(arr) {
      var element, valid, _i, _len;
      for (_i = 0, _len = arr.length; _i < _len; _i++) {
        element = arr[_i];
        if (element instanceof Array) {
          valid = arguments.callee(element);
        } else {
          if (!isFinite(element)) {
            console.warn("Invalid number found: " + element);
            console.printStackTrace();
            return false;
          }
        }
      }
    };

    ArrayUtils.printArray = function(arr) {
      var subarr, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = arr.length; _i < _len; _i++) {
        subarr = arr[_i];
        _results.push(console.log(subarr));
      }
      return _results;
    };

    return ArrayUtils;

  })();

  module.exports = ArrayUtils;

}).call(this);


},{}],40:[function(require,module,exports){
(function() {
  var MathUtils, MatrixStamper, RowInfo;

  MathUtils = require('../util/mathUtils.coffee');

  RowInfo = require('./rowInfo.coffee');

  MatrixStamper = (function() {
    function MatrixStamper(Circuit) {
      this.Circuit = Circuit;
    }

    /*
    control voltage source vs with voltage from n1 to n2 (must also call stampVoltageSource())
    */


    MatrixStamper.prototype.stampVCVS = function(n1, n2, coef, vs) {
      var vn;
      if (isNaN(vs) || isNaN(coef)) {
        console.log("NaN in stampVCVS");
      }
      vn = this.Circuit.numNodes() + vs;
      this.stampMatrix(vn, n1, coef);
      return this.stampMatrix(vn, n2, -coef);
    };

    MatrixStamper.prototype.stampVoltageSource = function(n1, n2, vs, v) {
      var vn;
      vn = this.Circuit.numNodes() + vs;
      console.log("Stamp voltage source " + " " + n1 + " " + n2 + " " + vs + " " + v);
      this.stampMatrix(vn, n1, -1);
      this.stampMatrix(vn, n2, 1);
      this.stampRightSide(vn, v);
      this.stampMatrix(n1, vn, 1);
      return this.stampMatrix(n2, vn, -1);
    };

    MatrixStamper.prototype.updateVoltageSource = function(n1, n2, vs, voltage) {
      var vn;
      vn = this.Circuit.numNodes() + vs;
      return this.stampRightSide(vn, voltage);
    };

    MatrixStamper.prototype.stampResistor = function(n1, n2, r) {
      var a, r0;
      console.log("Stamp resistor: " + n1 + " " + n2 + " " + r);
      r0 = 1 / r;
      if (isNaN(r0) || MathUtils.isInfinite(r0)) {
        this.Circuit.halt("bad resistance");
        a = 0;
        a /= a;
      }
      this.stampMatrix(n1, n1, r0);
      this.stampMatrix(n2, n2, r0);
      this.stampMatrix(n1, n2, -r0);
      return this.stampMatrix(n2, n1, -r0);
    };

    MatrixStamper.prototype.stampConductance = function(n1, n2, r0) {
      if (isNaN(r0) || MathUtils.isInfinite(r0)) {
        this.Circuit.halt("bad conductance");
      }
      this.stampMatrix(n1, n1, r0);
      this.stampMatrix(n2, n2, r0);
      this.stampMatrix(n1, n2, -r0);
      return this.stampMatrix(n2, n1, -r0);
    };

    /*
    current from cn1 to cn2 is equal to voltage from vn1 to 2, divided by g
    */


    MatrixStamper.prototype.stampVCCurrentSource = function(cn1, cn2, vn1, vn2, value) {
      if (isNaN(gain) || MathUtils.isInfinite(gain)) {
        this.Circuit.halt("Invalid gain on voltage controlled current source");
      }
      this.stampMatrix(cn1, vn1, value);
      this.stampMatrix(cn2, vn2, value);
      this.stampMatrix(cn1, vn2, -value);
      return this.stampMatrix(cn2, vn1, -value);
    };

    MatrixStamper.prototype.stampCurrentSource = function(n1, n2, value) {
      this.stampRightSide(n1, -value);
      return this.stampRightSide(n2, value);
    };

    /*
    stamp a current source from n1 to n2 depending on current through vs
    */


    MatrixStamper.prototype.stampCCCS = function(n1, n2, vs, gain) {
      var vn;
      if (isNaN(gain) || MathUtils.isInfinite(gain)) {
        this.Circuit.halt("Invalid gain on current source");
      }
      vn = this.Circuit.numNodes() + vs;
      this.stampMatrix(n1, vn, gain);
      return this.stampMatrix(n2, vn, -gain);
    };

    /*
    stamp value x in row i, column j, meaning that a voltage change
    of dv in node j will increase the current into node i by x dv.
    (Unless i or j is a voltage source node.)
    */


    MatrixStamper.prototype.stampMatrix = function(row, col, value) {
      var rowInfo;
      if (isNaN(value) || MathUtils.isInfinite(value)) {
        this.Circuit.halt("attempted to stamp Matrix with invalid value");
      }
      if (row > 0 && col > 0) {
        if (this.Circuit.Solver.circuitNeedsMap) {
          row = this.Circuit.Solver.circuitRowInfo[row - 1].mapRow;
          rowInfo = this.Circuit.Solver.circuitRowInfo[col - 1];
          if (rowInfo.type === RowInfo.ROW_CONST) {
            this.Circuit.Solver.circuitRightSide[row] -= value * rowInfo.value;
            return;
          }
          col = rowInfo.mapCol;
        } else {
          row--;
          col--;
        }
        return this.Circuit.Solver.circuitMatrix[row][col] += value;
      }
    };

    /*
    Stamp value x on the right side of row i, representing an
    independent current source flowing into node i
    */


    MatrixStamper.prototype.stampRightSide = function(row, value) {
      if (isNaN(value) || value === null) {
        if (row > 0) {
          console.log("rschanges true " + (row - 1));
          return this.Circuit.Solver.circuitRowInfo[row - 1].rsChanges = true;
        }
      } else {
        if (row > 0) {
          if (this.Circuit.Solver.circuitNeedsMap) {
            row = this.Circuit.Solver.circuitRowInfo[row - 1].mapRow;
          } else {
            row--;
          }
          return this.Circuit.Solver.circuitRightSide[row] += value;
        }
      }
    };

    /*
    Indicate that the values on the left side of row i change in doStep()
    */


    MatrixStamper.prototype.stampNonLinear = function(row) {
      if (isNaN(row) || (row === null)) {
        console.error("null/NaN in stampNonlinear");
      }
      if (row > 0) {
        return this.Circuit.Solver.circuitRowInfo[row - 1].lsChanges = true;
      }
    };

    return MatrixStamper;

  })();

  module.exports = MatrixStamper;

}).call(this);


},{"../util/mathUtils.coffee":48,"./rowInfo.coffee":44}],41:[function(require,module,exports){
(function() {
  var CapacitorElm, CurrentElm, InductorElm, Pathfinder, ResistorElm, VoltageElm;

  VoltageElm = require('../circuit/components/VoltageElm.coffee');

  CurrentElm = require('../circuit/components/CurrentElm.coffee');

  ResistorElm = require('../circuit/components/ResistorElm.coffee');

  InductorElm = require('../circuit/components/InductorElm.coffee');

  CapacitorElm = require('../circuit/components/CapacitorElm.coffee');

  Pathfinder = (function() {
    Pathfinder.INDUCT = 1;

    Pathfinder.VOLTAGE = 2;

    Pathfinder.SHORT = 3;

    Pathfinder.CAP_V = 4;

    function Pathfinder(type, firstElm, dest, elementList, numNodes) {
      this.type = type;
      this.firstElm = firstElm;
      this.dest = dest;
      this.elementList = elementList;
      this.used = new Array(numNodes);
    }

    Pathfinder.prototype.findPath = function(n1, depth) {
      var c, ce, j, k, _i, _j, _k, _l, _len, _ref, _ref1, _ref2, _ref3;
      if (n1 === this.dest) {
        console.log("n1 is @dest");
        return true;
      }
      if (depth-- === 0) {
        return false;
      }
      if (this.used[n1]) {
        console.log("used " + n1);
        return false;
      }
      this.used[n1] = true;
      _ref = this.elementList;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ce = _ref[_i];
        if (ce === this.firstElm) {
          console.log("ce is @firstElm");
          continue;
        }
        if ((ce instanceof CurrentElm) && (this.type === Pathfinder.INDUCT)) {
          continue;
        }
        if (this.type === Pathfinder.VOLTAGE) {
          if (!(ce.isWire() || ce instanceof VoltageElm)) {
            console.log("type == VOLTAGE");
            continue;
          }
        }
        if (this.type === Pathfinder.SHORT && !ce.isWire()) {
          console.log("(type == SHORT && !ce.isWire())");
          continue;
        }
        if (this.type === Pathfinder.CAP_V) {
          if (!(ce.isWire() || ce instanceof CapacitorElm || ce instanceof VoltageElm)) {
            console.log("if !(ce.isWire() or ce instanceof CapacitorElm or ce instanceof VoltageElm)");
            continue;
          }
        }
        if (n1 === 0) {
          for (j = _j = 0, _ref1 = ce.getPostCount(); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; j = 0 <= _ref1 ? ++_j : --_j) {
            if (ce.hasGroundConnection(j) && this.findPath(ce.getNode(j), depth)) {
              console.log(ce + " has ground (n1 is 0)");
              this.used[n1] = false;
              return true;
            }
          }
        }
        for (j = _k = 0, _ref2 = ce.getPostCount(); 0 <= _ref2 ? _k < _ref2 : _k > _ref2; j = 0 <= _ref2 ? ++_k : --_k) {
          console.log("get post " + ce.dump() + " " + ce.getNode(j));
          if (ce.getNode(j) === n1) {
            break;
          }
        }
        if (j === ce.getPostCount()) {
          continue;
        }
        if (ce.hasGroundConnection(j) && this.findPath(0, depth)) {
          console.log(ce + " has ground");
          this.used[n1] = false;
          return true;
        }
        if (this.type === Pathfinder.INDUCT && ce instanceof InductorElm) {
          c = ce.getCurrent();
          if (j === 0) {
            c = -c;
          }
          console.log(ce + " > " + this.firstElm + " >> matching " + ce + " to " + this.firstElm.getCurrent());
          if (Math.abs(c - this.firstElm.getCurrent()) > 1e-10) {
            continue;
          }
        }
        for (k = _l = 0, _ref3 = ce.getPostCount(); 0 <= _ref3 ? _l < _ref3 : _l > _ref3; k = 0 <= _ref3 ? ++_l : --_l) {
          if (j === k) {
            continue;
          }
          console.log(ce + " " + ce.getNode(j) + " - " + ce.getNode(k));
          if (ce.getConnection(j, k) && this.findPath(ce.getNode(k), depth)) {
            this.used[n1] = false;
            console.log("got findpath " + n1);
            return true;
          }
        }
      }
      this.used[n1] = false;
      return false;
    };

    return Pathfinder;

  })();

  module.exports = Pathfinder;

}).call(this);


},{"../circuit/components/CurrentElm.coffee":30,"../circuit/components/VoltageElm.coffee":23,"../circuit/components/ResistorElm.coffee":21,"../circuit/components/InductorElm.coffee":28,"../circuit/components/CapacitorElm.coffee":27}],46:[function(require,module,exports){
(function() {
  var DrawHelper, Point, Polygon, Rectangle, Settings;

  Settings = require('../settings/settings.coffee');

  Polygon = require('../geom/polygon.coffee');

  Rectangle = require('../geom/rectangle.coffee');

  Point = require('../geom/point.coffee');

  DrawHelper = (function() {
    var EPSILON;

    function DrawHelper() {}

    DrawHelper.ps1 = new Point(0, 0);

    DrawHelper.ps2 = new Point(0, 0);

    DrawHelper.colorScaleCount = 32;

    DrawHelper.colorScale = [];

    DrawHelper.muString = "u";

    DrawHelper.ohmString = "ohm";

    EPSILON = 0.48;

    DrawHelper.initializeColorScale = function() {
      var i, n1, n2, voltage, _i, _ref, _results;
      this.colorScale = new Array(this.colorScaleCount);
      _results = [];
      for (i = _i = 0, _ref = this.colorScaleCount; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        voltage = i * 2 / this.colorScaleCount - 1;
        if (voltage < 0) {
          n1 = Math.floor((128 * -voltage) + 127);
          n2 = Math.floor(127 * (1 + voltage));
          _results.push(this.colorScale[i] = new Color(n1, n2, n2));
        } else {
          n1 = Math.floor((128 * voltage) + 127);
          n2 = Math.floor(127 * (1 - voltage));
          _results.push(this.colorScale[i] = new Color(n2, n1, n2));
        }
      }
      return _results;
    };

    DrawHelper.scale = ["#ff0000", "#f70707", "#ef0f0f", "#e71717", "#df1f1f", "#d72727", "#cf2f2f", "#c73737", "#bf3f3f", "#b74747", "#af4f4f", "#a75757", "#9f5f5f", "#976767", "#8f6f6f", "#877777", "#7f7f7f", "#778777", "#6f8f6f", "#679767", "#5f9f5f", "#57a757", "#4faf4f", "#47b747", "#3fbf3f", "#37c737", "#2fcf2f", "#27d727", "#1fdf1f", "#17e717", "#0fef0f", "#07f707", "#00ff00"];

    DrawHelper.unitsFont = "Arial, Helvetica, sans-serif";

    DrawHelper.interpPoint = function(ptA, ptB, f, g) {
      var gx, gy, ptOut;
      if (g == null) {
        g = 0;
      }
      gx = ptB.y - ptA.y;
      gy = ptA.x - ptB.x;
      g /= Math.sqrt(gx * gx + gy * gy);
      ptOut = new Point();
      ptOut.x = Math.floor((1 - f) * ptA.x + (f * ptB.x) + g * gx + EPSILON);
      ptOut.y = Math.floor((1 - f) * ptA.y + (f * ptB.y) + g * gy + EPSILON);
      return ptOut;
    };

    DrawHelper.interpPoint2 = function(ptA, ptB, f, g) {
      var gx, gy, ptOut1, ptOut2;
      gx = ptB.y - ptA.y;
      gy = ptA.x - ptB.x;
      g /= Math.sqrt(gx * gx + gy * gy);
      ptOut1 = new Point();
      ptOut2 = new Point();
      ptOut1.x = Math.floor((1 - f) * ptA.x + (f * ptB.x) + g * gx + EPSILON);
      ptOut1.y = Math.floor((1 - f) * ptA.y + (f * ptB.y) + g * gy + EPSILON);
      ptOut2.x = Math.floor((1 - f) * ptA.x + (f * ptB.x) - g * gx + EPSILON);
      ptOut2.y = Math.floor((1 - f) * ptA.y + (f * ptB.y) - g * gy + EPSILON);
      return [ptOut1, ptOut2];
    };

    DrawHelper.calcArrow = function(point1, point2, al, aw) {
      var dist, dx, dy, p1, p2, poly, _ref;
      poly = new Polygon();
      dx = point2.x - point1.x;
      dy = point2.y - point1.y;
      dist = Math.sqrt(dx * dx + dy * dy);
      poly.addVertex(point2.x, point2.y);
      _ref = this.interpPoint2(point1, point2, 1 - al / dist, aw), p1 = _ref[0], p2 = _ref[1];
      poly.addVertex(p1.x, p1.y);
      poly.addVertex(p2.x, p2.y);
      return poly;
    };

    DrawHelper.createPolygon = function(pt1, pt2, pt3, pt4) {
      var newPoly;
      newPoly = new Polygon();
      newPoly.addVertex(pt1.x, pt1.y);
      newPoly.addVertex(pt2.x, pt2.y);
      newPoly.addVertex(pt3.x, pt3.y);
      if (pt4) {
        newPoly.addVertex(pt4.x, pt4.y);
      }
      return newPoly;
    };

    DrawHelper.createPolygonFromArray = function(vertexArray) {
      var newPoly, vertex, _i, _len;
      newPoly = new Polygon();
      for (_i = 0, _len = vertexArray.length; _i < _len; _i++) {
        vertex = vertexArray[_i];
        newPoly.addVertex(vertex.x, vertex.y);
      }
      return newPoly;
    };

    DrawHelper.drawCoil = function(hs, point1, point2, vStart, vEnd, renderContext) {
      var color, cx, hsx, i, segments, voltageLevel, _i, _results;
      segments = 40;
      this.ps1.x = point1.x;
      this.ps1.y = point1.y;
      _results = [];
      for (i = _i = 0; 0 <= segments ? _i < segments : _i > segments; i = 0 <= segments ? ++_i : --_i) {
        cx = (((i + 1) * 8 / segments) % 2) - 1;
        hsx = Math.sqrt(1 - cx * cx);
        this.ps2 = this.interpPoint(point1, point2, i / segments, hsx * hs);
        voltageLevel = vStart + (vEnd - vStart) * i / segments;
        color = this.getVoltageColor(voltageLevel);
        renderContext.drawThickLinePt(this.ps1, this.ps2, color);
        this.ps1.x = this.ps2.x;
        _results.push(this.ps1.y = this.ps2.y);
      }
      return _results;
    };

    DrawHelper.getShortUnitText = function(value, unit) {
      return this.getUnitText(value, unit, 1);
    };

    DrawHelper.getUnitText = function(value, unit, decimalPoints) {
      var absValue;
      if (decimalPoints == null) {
        decimalPoints = 2;
      }
      absValue = Math.abs(value);
      if (absValue < 1e-18) {
        return "0 " + unit;
      }
      if (absValue < 1e-12) {
        return (value * 1e15).toFixed(decimalPoints) + " f" + unit;
      }
      if (absValue < 1e-9) {
        return (value * 1e12).toFixed(decimalPoints) + " p" + unit;
      }
      if (absValue < 1e-6) {
        return (value * 1e9).toFixed(decimalPoints) + " n" + unit;
      }
      if (absValue < 1e-3) {
        return (value * 1e6).toFixed(decimalPoints) + " " + this.muString + unit;
      }
      if (absValue < 1) {
        return (value * 1e3).toFixed(decimalPoints) + " m" + unit;
      }
      if (absValue < 1e3) {
        return value.toFixed(decimalPoints) + " " + unit;
      }
      if (absValue < 1e6) {
        return (value * 1e-3).toFixed(decimalPoints) + " k" + unit;
      }
      if (absValue < 1e9) {
        return (value * 1e-6).toFixed(decimalPoints) + " M" + unit;
      }
      return (value * 1e-9).toFixed(decimalPoints) + " G" + unit;
    };

    DrawHelper.getVoltageDText = function(v) {
      return this.getUnitText(Math.abs(v), "V");
    };

    DrawHelper.getVoltageText = function(v) {
      return this.getUnitText(v, "V");
    };

    DrawHelper.getCurrentText = function(value) {
      return this.getUnitText(value, "A");
    };

    DrawHelper.getCurrentDText = function(value) {
      return this.getUnitText(Math.abs(value), "A");
    };

    DrawHelper.getVoltageColor = function(volts, fullScaleVRange) {
      var value;
      if (fullScaleVRange == null) {
        fullScaleVRange = 10;
      }
      value = Math.floor((volts + fullScaleVRange) * (this.colorScaleCount - 1) / (2 * fullScaleVRange));
      if (value < 0) {
        value = 0;
      } else if (value >= this.colorScaleCount) {
        value = this.colorScaleCount - 1;
      }
      return this.scale[value];
    };

    DrawHelper.getPowerColor = function(power, scaleFactor) {
      var b, powerLevel, rg;
      if (scaleFactor == null) {
        scaleFactor = 1;
      }
      if (!Settings.powerCheckItem) {
        return;
      }
      powerLevel = power * scaleFactor;
      power = Math.abs(powerLevel);
      if (power > 1) {
        power = 1;
      }
      rg = 128 + Math.floor(power * 127);
      return b = Math.floor(128 * (1 - power));
    };

    return DrawHelper;

  })();

  module.exports = DrawHelper;

}).call(this);


},{"../settings/settings.coffee":17,"../geom/polygon.coffee":50,"../geom/rectangle.coffee":18,"../geom/point.coffee":47}],20:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, Rectangle, Settings, WireElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  WireElm = (function(_super) {
    __extends(WireElm, _super);

    function WireElm(xa, ya, xb, yb, f, st) {
      WireElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
    }

    WireElm.prototype.toString = function() {
      return "WireElm";
    };

    WireElm.FLAG_SHOWCURRENT = 1;

    WireElm.FLAG_SHOWVOLTAGE = 2;

    WireElm.prototype.draw = function(renderContext) {
      var s;
      renderContext.drawThickLinePt(this.point1, this.point2, DrawHelper.getVoltageColor(this.volts[0]));
      this.setBboxPt(this.point1, this.point2, 3);
      if (this.mustShowCurrent()) {
        s = DrawHelper.getUnitText(Math.abs(this.getCurrent()), "A");
        this.drawValues(s, 4, renderContext);
      } else if (this.mustShowVoltage()) {
        s = DrawHelper.getUnitText(this.volts[0], "V");
      }
      this.drawValues(s, 4, renderContext);
      this.drawPosts(renderContext);
      return this.drawDots(this.point1, this.point2, renderContext);
    };

    WireElm.prototype.stamp = function(stamper) {
      console.log("\nStamping Wire Elm");
      return stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
    };

    WireElm.prototype.mustShowCurrent = function() {
      return (this.flags & WireElm.FLAG_SHOWCURRENT) !== 0;
    };

    WireElm.prototype.mustShowVoltage = function() {
      return (this.flags & WireElm.FLAG_SHOWVOLTAGE) !== 0;
    };

    WireElm.prototype.getVoltageSourceCount = function() {
      return 1;
    };

    WireElm.prototype.getInfo = function(arr) {
      WireElm.__super__.getInfo.call(this);
      arr[0] = "Wire";
      arr[1] = "I = " + DrawHelper.getCurrentDText(this.getCurrent());
      return arr[2] = "V = " + DrawHelper.getVoltageText(this.volts[0]);
    };

    WireElm.prototype.getEditInfo = function(n) {};

    WireElm.prototype.setEditValue = function(n, ei) {};

    WireElm.prototype.getDumpType = function() {
      return "w";
    };

    WireElm.prototype.getPower = function() {
      return 0;
    };

    WireElm.prototype.getVoltageDiff = function() {
      return this.volts[0];
    };

    WireElm.prototype.isWire = function() {
      return true;
    };

    WireElm.prototype.needsShortcut = function() {
      return true;
    };

    return WireElm;

  })(CircuitComponent);

  module.exports = WireElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],21:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, Rectangle, ResistorElm, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  ResistorElm = (function(_super) {
    __extends(ResistorElm, _super);

    function ResistorElm(xa, ya, xb, yb, f, st) {
      if (f == null) {
        f = 0;
      }
      if (st == null) {
        st = null;
      }
      ResistorElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
      if (st && st.length > 0) {
        this.resistance = parseFloat(st);
      } else {
        this.resistance = 500;
      }
      this.ps3 = new Point(100, 50);
      this.ps4 = new Point(100, 150);
    }

    ResistorElm.prototype.draw = function(renderContext) {
      var hs, i, newOffset, oldOffset, pt1, pt2, resistanceVal, segf, segments, volt1, volt2, voltDrop, _i;
      segments = 16;
      oldOffset = 0;
      hs = 6;
      volt1 = this.volts[0];
      volt2 = this.volts[1];
      this.setBboxPt(this.point1, this.point2, hs);
      this.draw2Leads(renderContext);
      DrawHelper.getPowerColor(this.getPower);
      segf = 1 / segments;
      for (i = _i = 0; 0 <= segments ? _i < segments : _i > segments; i = 0 <= segments ? ++_i : --_i) {
        newOffset = 0;
        switch (i & 3) {
          case 0:
            newOffset = 1;
            break;
          case 2:
            newOffset = -1;
            break;
          default:
            newOffset = 0;
        }
        voltDrop = volt1 + (volt2 - volt1) * i / segments;
        pt1 = DrawHelper.interpPoint(this.lead1, this.lead2, i * segf, hs * oldOffset);
        pt2 = DrawHelper.interpPoint(this.lead1, this.lead2, (i + 1) * segf, hs * newOffset);
        renderContext.drawThickLinePt(pt1, pt2, DrawHelper.getVoltageColor(voltDrop));
        oldOffset = newOffset;
      }
      resistanceVal = DrawHelper.getUnitText(this.resistance, "ohm");
      this.drawValues(resistanceVal, hs, renderContext);
      this.drawDots(this.point1, this.point2, renderContext);
      return this.drawPosts(renderContext);
    };

    ResistorElm.prototype.dump = function() {
      return ResistorElm.__super__.dump.call(this) + " " + this.resistance;
    };

    ResistorElm.prototype.getDumpType = function() {
      return "r";
    };

    ResistorElm.prototype.getEditInfo = function(n) {
      if (n === 0) {
        return new EditInfo("Resistance (ohms):", this.resistance, 0, 0);
      }
      return null;
    };

    ResistorElm.prototype.setEditValue = function(n, ei) {
      if (ei.value > 0) {
        return this.resistance = ei.value;
      }
    };

    ResistorElm.prototype.getInfo = function(arr) {
      arr[0] = "resistor";
      this.getBasicInfo(arr);
      arr[3] = "R = " + DrawHelper.getUnitText(this.resistance, DrawHelper.ohmString);
      arr[4] = "P = " + DrawHelper.getUnitText(this.getPower(), "W");
      return arr;
    };

    ResistorElm.prototype.needsShortcut = function() {
      return true;
    };

    ResistorElm.prototype.calculateCurrent = function() {
      return this.current = (this.volts[0] - this.volts[1]) / this.resistance;
    };

    ResistorElm.prototype.setPoints = function() {
      ResistorElm.__super__.setPoints.call(this);
      this.calcLeads(32);
      this.ps3 = new Point(0, 0);
      return this.ps4 = new Point(0, 0);
    };

    ResistorElm.prototype.stamp = function(stamper) {
      console.log("\nStamping Resistor Elm");
      if (this.orphaned()) {
        console.warn("attempting to stamp an orphaned resistor");
      }
      return stamper.stampResistor(this.nodes[0], this.nodes[1], this.resistance);
    };

    ResistorElm.prototype.toString = function() {
      return "ResistorElm";
    };

    return ResistorElm;

  })(CircuitComponent);

  module.exports = ResistorElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],22:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, GroundElm, Point, Polygon, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  GroundElm = (function(_super) {
    __extends(GroundElm, _super);

    function GroundElm(xa, ya, xb, yb, f, st) {
      GroundElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
    }

    GroundElm.prototype.getDumpType = function() {
      return "g";
    };

    GroundElm.prototype.getPostCount = function() {
      return 1;
    };

    GroundElm.prototype.draw = function(renderContext) {
      var color, endPt, pt1, pt2, row, startPt, _i, _ref;
      color = DrawHelper.getVoltageColor(0);
      renderContext.drawThickLinePt(this.point1, this.point2, color);
      for (row = _i = 0; _i < 3; row = ++_i) {
        startPt = 10 - row * 2;
        endPt = row * 3;
        _ref = DrawHelper.interpPoint2(this.point1, this.point2, 1 + endPt / this.dn, startPt), pt1 = _ref[0], pt2 = _ref[1];
        renderContext.drawThickLinePt(pt1, pt2, color);
      }
      pt2 = DrawHelper.interpPoint(this.point1, this.point2, 1 + 11.0 / this.dn);
      this.setBboxPt(this.point1, pt2, 11);
      this.drawPost(this.x1, this.y1, this.nodes[0], renderContext);
      return this.drawDots(this.point1, this.point2, renderContext);
    };

    GroundElm.prototype.setCurrent = function(x, currentVal) {
      return this.current = -currentVal;
    };

    GroundElm.prototype.stamp = function(stamper) {
      console.log("\nStamping Ground Elm");
      return stamper.stampVoltageSource(0, this.nodes[0], this.voltSource, 0);
    };

    GroundElm.prototype.getVoltageDiff = function() {
      return 0;
    };

    GroundElm.prototype.getVoltageSourceCount = function() {
      return 1;
    };

    GroundElm.prototype.getInfo = function(arr) {
      GroundElm.__super__.getInfo.call(this);
      arr[0] = "ground";
      return arr[1] = "I = " + DrawHelper.getCurrentText(this.getCurrent());
    };

    GroundElm.prototype.hasGroundConnection = function(n1) {
      return true;
    };

    GroundElm.prototype.needsShortcut = function() {
      return true;
    };

    GroundElm.prototype.toString = function() {
      return "GroundElm";
    };

    return GroundElm;

  })(CircuitComponent);

  module.exports = GroundElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],23:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, Rectangle, Settings, VoltageElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  VoltageElm = (function(_super) {
    __extends(VoltageElm, _super);

    VoltageElm.FLAG_COS = 2;

    VoltageElm.WF_DC = 0;

    VoltageElm.WF_AC = 1;

    VoltageElm.WF_SQUARE = 2;

    VoltageElm.WF_TRIANGLE = 3;

    VoltageElm.WF_SAWTOOTH = 4;

    VoltageElm.WF_PULSE = 5;

    VoltageElm.WF_VAR = 6;

    VoltageElm.circleSize = 17;

    function VoltageElm(xa, ya, xb, yb, f, st) {
      VoltageElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
      this.waveform = VoltageElm.WF_DC;
      this.frequency = 40;
      this.maxVoltage = 5;
      this.freqTimeZero = 0;
      this.bias = 0;
      this.phaseShift = 0;
      this.dutyCycle = 0.5;
      if (st) {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        this.waveform = (st[0] ? Math.floor(parseInt(st[0])) : VoltageElm.WF_DC);
        this.frequency = (st[1] ? parseFloat(st[1]) : 40);
        this.maxVoltage = (st[2] ? parseFloat(st[2]) : 5);
        this.bias = (st[3] ? parseFloat(st[3]) : 0);
        this.phaseShift = (st[4] ? parseFloat(st[4]) : 0);
        this.dutyCycle = (st[5] ? parseFloat(st[5]) : 0.5);
      }
      if (this.flags & VoltageElm.FLAG_COS !== 0) {
        this.flags &= ~VoltageElm.FLAG_COS;
        this.phaseShift = Math.PI / 2;
      }
      this.reset();
    }

    VoltageElm.prototype.getDumpType = function() {
      return "v";
    };

    VoltageElm.prototype.dump = function() {
      return "" + (VoltageElm.__super__.dump.call(this)) + " " + this.waveform + " " + this.frequency + " " + this.maxVoltage + " " + this.bias + " " + this.phaseShift + " " + this.dutyCycle;
    };

    VoltageElm.prototype.reset = function() {
      this.freqTimeZero = 0;
      return this.curcount = 5;
    };

    VoltageElm.prototype.triangleFunc = function(x) {
      if (x < Math.PI) {
        return x * (2 / Math.PI) - 1;
      }
      return 1 - (x - Math.PI) * (2 / Math.PI);
    };

    VoltageElm.prototype.stamp = function(stamper) {
      console.log("\nStamping Voltage Elm");
      if (this.waveform === VoltageElm.WF_DC) {
        return stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.getVoltage());
      } else {
        return stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource);
      }
    };

    VoltageElm.prototype.doStep = function(stamper) {
      if (this.waveform !== VoltageElm.WF_DC) {
        return stamper.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.getVoltage());
      }
    };

    VoltageElm.prototype.getVoltage = function() {
      var omega;
      omega = 2 * Math.PI * (this.Circuit.time - this.freqTimeZero) * this.frequency + this.phaseShift;
      switch (this.waveform) {
        case VoltageElm.WF_DC:
          return this.maxVoltage + this.bias;
        case VoltageElm.WF_AC:
          return Math.sin(omega) * this.maxVoltage + this.bias;
        case VoltageElm.WF_SQUARE:
          return this.bias + (omega % (2 * Math.PI) > (2 * Math.PI * this.dutyCycle) ? -this.maxVoltage : this.maxVoltage);
        case VoltageElm.WF_TRIANGLE:
          return this.bias + this.triangleFunc(omega % (2 * Math.PI)) * this.maxVoltage;
        case VoltageElm.WF_SAWTOOTH:
          return this.bias + (omega % (2 * Math.PI)) * (this.maxVoltage / Math.PI) - this.maxVoltage;
        case VoltageElm.WF_PULSE:
          if ((omega % (2 * Math.PI)) < 1) {
            return this.maxVoltage + this.bias;
          } else {
            return this.bias;
          }
          break;
        default:
          return 0;
      }
    };

    VoltageElm.prototype.setPoints = function() {
      VoltageElm.__super__.setPoints.call(this);
      if (this.waveform === VoltageElm.WF_DC || this.waveform === VoltageElm.WF_VAR) {
        return this.calcLeads(8);
      } else {
        return this.calcLeads(VoltageElm.circleSize * 2);
      }
    };

    VoltageElm.prototype.draw = function(renderContext) {
      var ps1, ptA, ptB, _ref, _ref1;
      this.setBbox(this.x1, this.y2, this.x2, this.y2);
      this.draw2Leads(renderContext);
      if (!this.isBeingDragged()) {
        if (this.waveform === VoltageElm.WF_DC) {
          this.drawDots(this.point1, this.point2, renderContext);
        } else {
          this.drawDots(this.point1, this.lead1, renderContext);
        }
      }
      if (this.waveform === VoltageElm.WF_DC) {
        _ref = DrawHelper.interpPoint2(this.lead1, this.lead2, 0, 10), ptA = _ref[0], ptB = _ref[1];
        renderContext.drawThickLinePt(this.lead1, ptA, DrawHelper.getVoltageColor(this.volts[0]));
        renderContext.drawThickLinePt(ptA, ptB, DrawHelper.getVoltageColor(this.volts[0]));
        this.setBboxPt(this.point1, this.point2, 16);
        _ref1 = DrawHelper.interpPoint2(this.lead1, this.lead2, 1, 16), ptA = _ref1[0], ptB = _ref1[1];
        renderContext.drawThickLinePt(ptA, ptB, DrawHelper.getVoltageColor(this.volts[1]));
      } else {
        this.setBboxPt(this.point1, this.point2, VoltageElm.circleSize);
        ps1 = DrawHelper.interpPoint(this.lead1, this.lead2, 0.5);
        this.drawWaveform(ps1, renderContext);
      }
      return this.drawPosts(renderContext);
    };

    VoltageElm.prototype.drawWaveform = function(center, renderContext) {
      var color, i, ox, oy, valueString, wl, xc, xc2, xl, yc, yy;
      color = this.needsHighlight() ? Settings.FG_COLOR : void 0;
      xc = center.x;
      yc = center.y;
      renderContext.fillCircle(xc, yc, VoltageElm.circleSize, 2, "#FFFFFF");
      wl = 8;
      this.adjustBbox(xc - VoltageElm.circleSize, yc - VoltageElm.circleSize, xc + VoltageElm.circleSize, yc + VoltageElm.circleSize);
      xc2 = void 0;
      switch (this.waveform) {
        case VoltageElm.WF_DC:
          break;
        case VoltageElm.WF_SQUARE:
          xc2 = Math.floor(wl * 2 * this.dutyCycle - wl + xc);
          xc2 = Math.max(xc - wl + 3, Math.min(xc + wl - 3, xc2));
          renderContext.drawThickLine(xc - wl, yc - wl, xc - wl, yc, color);
          renderContext.drawThickLine(xc - wl, yc - wl, xc2, yc - wl, color);
          renderContext.drawThickLine(xc2, yc - wl, xc2, yc + wl, color);
          renderContext.drawThickLine(xc + wl, yc + wl, xc2, yc + wl, color);
          renderContext.drawThickLine(xc + wl, yc, xc + wl, yc + wl, color);
          break;
        case VoltageElm.WF_PULSE:
          yc += wl / 2;
          renderContext.drawThickLine(xc - wl, yc - wl, xc - wl, yc, color);
          renderContext.drawThickLine(xc - wl, yc - wl, xc - wl / 2, yc - wl, color);
          renderContext.drawThickLine(xc - wl / 2, yc - wl, xc - wl / 2, yc, color);
          renderContext.drawThickLine(xc - wl / 2, yc, xc + wl, yc, color);
          break;
        case VoltageElm.WF_SAWTOOTH:
          renderContext.drawThickLine(xc, yc - wl, xc - wl, yc, color);
          renderContext.drawThickLine(xc, yc - wl, xc, yc + wl, color);
          renderContext.drawThickLine(xc, yc + wl, xc + wl, yc, color);
          break;
        case VoltageElm.WF_TRIANGLE:
          xl = 5;
          renderContext.drawThickLine(xc - xl * 2, yc, xc - xl, yc - wl, color);
          renderContext.drawThickLine(xc - xl, yc - wl, xc, yc, color);
          renderContext.drawThickLine(xc, yc, xc + xl, yc + wl, color);
          renderContext.drawThickLine(xc + xl, yc + wl, xc + xl * 2, yc, color);
          break;
        case VoltageElm.WF_AC:
          xl = 10;
          ox = -1;
          oy = -1;
          i = -xl;
          while (i <= xl) {
            yy = yc + Math.floor(0.95 * Math.sin(i * Math.PI / xl) * wl);
            if (ox !== -1) {
              renderContext.drawThickLine(ox, oy, xc + i, yy, color);
            }
            ox = xc + i;
            oy = yy;
            i++;
          }
      }
      if (Settings.SHOW_VALUES) {
        valueString = DrawHelper.getShortUnitText(this.frequency, "Hz");
        if (this.dx === 0 || this.dy === 0) {
          return this.drawValues(valueString, VoltageElm.circleSize);
        }
      }
    };

    VoltageElm.prototype.getVoltageSourceCount = function() {
      return 1;
    };

    VoltageElm.prototype.getPower = function() {
      return -this.getVoltageDiff() * this.current;
    };

    VoltageElm.prototype.getVoltageDiff = function() {
      return this.volts[1] - this.volts[0];
    };

    VoltageElm.prototype.getInfo = function(arr) {
      var i;
      switch (this.waveform) {
        case VoltageElm.WF_DC:
        case VoltageElm.WF_VAR:
          arr[0] = "voltage source";
          break;
        case VoltageElm.WF_AC:
          arr[0] = "A/C source";
          break;
        case VoltageElm.WF_SQUARE:
          arr[0] = "square wave gen";
          break;
        case VoltageElm.WF_PULSE:
          arr[0] = "pulse gen";
          break;
        case VoltageElm.WF_SAWTOOTH:
          arr[0] = "sawtooth gen";
          break;
        case VoltageElm.WF_TRIANGLE:
          arr[0] = "triangle gen";
      }
      arr[1] = "I = " + DrawHelper.getCurrentText(this.getCurrent());
      if (this.waveform !== VoltageElm.WF_DC && this.waveform !== VoltageElm.WF_VAR) {
        arr[3] = "f = " + DrawHelper.getUnitText(this.frequency, "Hz");
        arr[4] = "Vmax = " + DrawHelper.getVoltageText(this.maxVoltage);
        i = 5;
        if (this.bias !== 0) {
          arr[i++] = "Voff = " + this.getVoltageText(this.bias);
        } else {
          if (this.frequency > 500) {
            arr[i++] = "wavelength = " + DrawHelper.getUnitText(2.9979e8 / this.frequency, "m");
          }
        }
        return arr[i++] = "P = " + DrawHelper.getUnitText(this.getPower(), "W");
      }
    };

    VoltageElm.prototype.getEditInfo = function(n) {
      var ei;
      if (n === 0) {
        return new EditInfo((this.waveform === VoltageElm.WF_DC ? "Voltage" : "Max Voltage"), this.maxVoltage, -20, 20);
      }
      if (n === 1) {
        ei = new EditInfo("Waveform", this.waveform, -1, -1);
        ei.choice = new Array();
        ei.choice.push("D/C");
        ei.choice.push("A/C");
        ei.choice.push("Square Wave");
        ei.choice.push("Triangle");
        ei.choice.push("Sawtooth");
        ei.choice.push("Pulse");
        ei.choice.push(this.waveform);
        return ei;
        if (this.waveform === VoltageElm.WF_DC) {
          return null;
        }
        if (n === 2) {
          return new EditInfo("Frequency (Hz)", this.frequency, 4, 500);
        }
        if (n === 3) {
          return new EditInfo("DC Offset (V)", this.bias, -20, 20);
        }
        if (n === 4) {
          return new EditInfo("Phase Offset (degrees)", this.phaseShift * 180 / Math.PI, -180, 180).setDimensionless();
        }
        if (n === 5 && this.waveform === VoltageElm.WF_SQUARE) {
          return new EditInfo("Duty Cycle", this.dutyCycle * 100, 0, 100).setDimensionless();
        }
      }
    };

    VoltageElm.prototype.setEditValue = function(n, ei) {
      var adj, maxfreq, oldfreq, waveform, _ref, _ref1;
      if (n === 0) {
        this.maxVoltage = ei.value;
      }
      if (n === 3) {
        this.bias = ei.value;
      }
      if (n === 2) {
        oldfreq = this.frequency;
        this.frequency = ei.value;
        maxfreq = 1 / (8 * simParams);
        if (this.frequency > maxfreq) {
          this.frequency = maxfreq;
        }
        adj = this.frequency - oldfreq;
        this.freqTimeZero = ((_ref = this.Circuit) != null ? _ref.time : void 0) - oldfreq * (((_ref1 = this.Circuit) != null ? _ref1.time : void 0) - this.freqTimeZero) / this.frequency;
      }
      if (n === 1) {
        waveform = this.waveform;
        if (this.waveform === VoltageElm.WF_DC && waveform !== VoltageElm.WF_DC) {
          this.bias = 0;
        } else {
          this.waveform !== VoltageElm.WF_DC && waveform === VoltageElm.WF_DC;
        }
        if ((this.waveform === VoltageElm.WF_SQUARE || waveform === VoltageElm.WF_SQUARE) && this.waveform !== waveform) {
          this.setPoints();
        }
      }
      if (n === 4) {
        this.phaseShift = ei.value * Math.PI / 180;
      }
      if (n === 5) {
        return this.dutyCycle = ei.value * 0.01;
      }
    };

    VoltageElm.prototype.toString = function() {
      return "VoltageElm";
    };

    return VoltageElm;

  })(CircuitComponent);

  module.exports = VoltageElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],24:[function(require,module,exports){
(function() {
  var CircuitComponent, DiodeElm, DrawHelper, Point, Polygon, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  DiodeElm = (function(_super) {
    __extends(DiodeElm, _super);

    DiodeElm.FLAG_FWDROP = 1;

    DiodeElm.DEFAULT_DROP = .805904783;

    function DiodeElm(xa, ya, xb, yb, f, st) {
      DiodeElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
      this.hs = 8;
      this.poly;
      this.cathode = [];
      this.diode = new Diode(self);
      this.fwdrop = DiodeElm.DEFAULT_DROP;
      this.zvoltage = 0;
      if ((f & DiodeElm.FLAG_FWDROP) > 0) {
        try {
          this.fwdrop = parseFloat(st);
        } catch (_error) {}
      }
      this.setup();
    }

    DiodeElm.prototype.nonLinear = function() {
      return true;
    };

    DiodeElm.prototype.setup = function() {
      return this.diode.setup(this.fwdrop, this.zvoltage);
    };

    DiodeElm.prototype.getDumpType = function() {
      return "d";
    };

    DiodeElm.prototype.dump = function() {
      this.flags |= DiodeElm.FLAG_FWDROP;
      return CircuitComponent.prototype.dump.call(this) + " " + this.fwdrop;
    };

    DiodeElm.prototype.setPoints = function() {
      var pa, pb, _ref, _ref1;
      DiodeElm.__super__.setPoints.call(this);
      this.calcLeads(16);
      this.cathode = CircuitComponent.newPointArray(2);
      _ref = DrawHelper.interpPoint2(this.lead1, this.lead2, 0, this.hs), pa = _ref[0], pb = _ref[1];
      _ref1 = DrawHelper.interpPoint2(this.lead1, this.lead2, 1, this.hs), this.cathode[0] = _ref1[0], this.cathode[1] = _ref1[1];
      return this.poly = DrawHelper.createPolygonFromArray([pa, pb, this.lead2]);
    };

    DiodeElm.prototype.draw = function(renderContext) {
      this.drawDiode(renderContext);
      this.drawDots(this.point1, this.point2, renderContext);
      return this.drawPosts(renderContext);
    };

    DiodeElm.prototype.reset = function() {
      this.diode.reset();
      return this.volts[0] = this.volts[1] = this.curcount = 0;
    };

    DiodeElm.prototype.drawDiode = function(renderContext) {
      var color, v1, v2;
      this.setBboxPt(this.point1, this.point2, this.hs);
      v1 = this.volts[0];
      v2 = this.volts[1];
      this.draw2Leads(renderContext);
      color = DrawHelper.getVoltageColor(v1);
      renderContext.drawThickPolygonP(this.poly, color);
      color = DrawHelper.getVoltageColor(v2);
      return renderContext.drawThickLinePt(this.cathode[0], this.cathode[1], color);
    };

    DiodeElm.prototype.stamp = function(stamper) {
      return this.diode.stamp(this.nodes[0], this.nodes[1], stamper);
    };

    DiodeElm.prototype.doStep = function(stamper) {
      return this.diode.doStep(this.volts[0] - this.volts[1], stamper);
    };

    DiodeElm.prototype.calculateCurrent = function() {
      return this.current = this.diode.calculateCurrent(this.volts[0] - this.volts[1]);
    };

    DiodeElm.prototype.getInfo = function(arr) {
      DiodeElm.__super__.getInfo.call(this);
      arr[0] = "diode";
      arr[1] = "I = " + DrawHelper.getCurrentText(this.getCurrent());
      arr[2] = "Vd = " + DrawHelper.getVoltageText(this.getVoltageDiff());
      arr[3] = "P = " + DrawHelper.getUnitText(this.getPower(), "W");
      return arr[4] = "Vf = " + DrawHelper.getVoltageText(this.fwdrop);
    };

    DiodeElm.prototype.getEditInfo = function(n) {
      if (n === 0) {
        return new EditInfo("Fwd Voltage @ 1A", this.fwdrop, 10, 1000);
      }
    };

    DiodeElm.prototype.setEditValue = function(n, ei) {
      this.fwdrop = ei.value;
      return this.setup();
    };

    DiodeElm.prototype.toString = function() {
      return "DiodeElm";
    };

    DiodeElm.prototype.needsShortcut = function() {
      return true;
    };

    return DiodeElm;

  })(CircuitComponent);

  return DiodeElm;

  module.exports = DiodeElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],25:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, OutputElm, Point, Polygon, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  OutputElm = (function(_super) {
    __extends(OutputElm, _super);

    OutputElm.FLAG_VALUE = 1;

    function OutputElm(xa, ya, xb, yb, f, st) {
      OutputElm.__super__.constructor.call(this, xa, ya, xb, yb, f);
    }

    OutputElm.prototype.getDumpType = function() {
      return "O";
    };

    OutputElm.prototype.getPostCount = function() {
      return 1;
    };

    OutputElm.prototype.setPoints = function() {
      OutputElm.__super__.setPoints.call(this);
      return this.lead1 = new Point();
    };

    OutputElm.prototype.draw = function(renderContext) {
      var color, s, selected;
      selected = this.needsHighlight();
      color = (selected ? Settings.SELECT_COLOR : "#FFF");
      s = ((this.flags & OutputElm.FLAG_VALUE) !== 0 ? DrawHelper.getVoltageText(this.volts[0]) : "out");
      this.lead1 = DrawHelper.interpPoint(this.point1, this.point2, 1 - (3 * s.length / 2 + 8) / this.dn);
      this.setBboxPt(this.point1, this.lead1, 0);
      this.drawCenteredText(s, this.x2, this.y2, true, renderContext);
      if (selected) {
        color = DrawHelper.getVoltageColor(this.volts[0]);
      } else {
        color = Settings.SELECT_COLOR;
      }
      renderContext.drawThickLinePt(this.point1, this.lead1, color);
      return this.drawPosts(renderContext);
    };

    OutputElm.prototype.getVoltageDiff = function() {
      return this.volts[0];
    };

    OutputElm.prototype.getInfo = function(arr) {
      arr[0] = "output";
      return arr[1] = "V = " + DrawHelper.getVoltageText(this.volts[0]);
    };

    OutputElm.prototype.getEditInfo = function(n) {
      var ei;
      if (n === 0) {
        ei = new EditInfo("", 0, -1, -1);
        ei.checkbox = "Show Voltage";
        return ei;
      }
      return null;
    };

    OutputElm.prototype.stamp = function(stamper) {};

    OutputElm.prototype.toString = function() {
      return "OutputElm";
    };

    OutputElm.prototype.setEditValue = function(n, ei) {};

    return OutputElm;

  })(CircuitComponent);

  module.exports = OutputElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],26:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, Rectangle, Settings, SwitchElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  SwitchElm = (function(_super) {
    __extends(SwitchElm, _super);

    function SwitchElm(xa, ya, xb, yb, f, st) {
      var str;
      SwitchElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
      this.momentary = false;
      this.position = 0;
      this.posCount = 2;
      this.ps = new Point(0, 0);
      this.ps2 = new Point(0, 0);
      if (st) {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        str = st.shift();
        this.position = 0;
      }
    }

    SwitchElm.prototype.getDumpType = function() {
      return "s";
    };

    SwitchElm.prototype.dump = function() {
      return "" + (SwitchElm.__super__.dump.call(this)) + " " + this.position + " " + this.momentary;
    };

    SwitchElm.prototype.setPoints = function() {
      SwitchElm.__super__.setPoints.call(this);
      this.calcLeads(32);
      this.ps = new Point(0, 0);
      return this.ps2 = new Point(0, 0);
    };

    SwitchElm.prototype.stamp = function(stamper) {
      console.log(this.voltSource);
      if (this.position === 0) {
        return stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, 0);
      }
    };

    SwitchElm.prototype.draw = function(renderContext) {
      var hs1, hs2, openhs;
      openhs = 16;
      hs1 = (this.position === 1 ? 0 : 2);
      hs2 = (this.position === 1 ? openhs : 2);
      this.setBboxPt(this.point1, this.point2, openhs);
      this.draw2Leads(renderContext);
      if (this.position === 0) {
        this.drawDots(renderContext);
      }
      this.ps = DrawHelper.interpPoint(this.lead1, this.lead2, 0, hs1);
      this.ps2 = DrawHelper.interpPoint(this.lead1, this.lead2, 1, hs2);
      renderContext.drawThickLinePt(this.ps, this.ps2, Settings.FG_COLOR);
      return this.drawPosts(renderContext);
    };

    SwitchElm.prototype.calculateCurrent = function() {
      if (this.position === 1) {
        return this.current = 0;
      }
    };

    SwitchElm.prototype.getVoltageSourceCount = function() {
      if (this.position === 1) {
        return 0;
      } else {
        return 1;
      }
    };

    SwitchElm.prototype.mouseUp = function() {
      if (this.momentary) {
        return this.toggle();
      }
    };

    SwitchElm.prototype.toggle = function() {
      this.position++;
      if (this.position >= this.posCount) {
        this.position = 0;
      }
      return this.Circuit.Solver.analyzeFlag = true;
    };

    SwitchElm.prototype.getInfo = function(arr) {
      arr[0] = (this.momentary ? "push switch (SPST)" : "switch (SPST)");
      if (this.position === 1) {
        arr[1] = "open";
        return arr[2] = "Vd = " + DrawHelper.getVoltageDText(this.getVoltageDiff());
      } else {
        arr[1] = "closed";
        arr[2] = "V = " + DrawHelper.getVoltageText(this.volts[0]);
        return arr[3] = "I = " + DrawHelper.getCurrentDText(this.getCurrent());
      }
    };

    SwitchElm.prototype.getConnection = function(n1, n2) {
      return this.position === 0;
    };

    SwitchElm.prototype.isWire = function() {
      return true;
    };

    SwitchElm.prototype.getEditInfo = function(n) {};

    SwitchElm.prototype.setEditValue = function(n, ei) {
      return n === 0;
    };

    SwitchElm.prototype.toString = function() {
      return "SwitchElm";
    };

    return SwitchElm;

  })(CircuitComponent);

  return SwitchElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],27:[function(require,module,exports){
(function() {
  var CapacitorElm, CircuitComponent, DrawHelper, Point, Polygon, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  CapacitorElm = (function(_super) {
    __extends(CapacitorElm, _super);

    CapacitorElm.FLAG_BACK_EULER = 2;

    function CapacitorElm(xa, ya, xb, yb, f, st) {
      CapacitorElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
      this.capacitance = 5e-6;
      this.compResistance = 11;
      this.voltDiff = 10;
      this.plate1 = [];
      this.plate2 = [];
      this.curSourceValue = 0;
      if (st) {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        this.capacitance = Number(st[0]);
        this.voltDiff = Number(st[1]);
      }
    }

    CapacitorElm.prototype.isTrapezoidal = function() {
      return (this.flags & CapacitorElm.FLAG_BACK_EULER) === 0;
    };

    CapacitorElm.prototype.nonLinear = function() {
      return false;
    };

    CapacitorElm.prototype.setNodeVoltage = function(n, c) {
      CapacitorElm.__super__.setNodeVoltage.call(this, n, c);
      return this.voltDiff = this.volts[0] - this.volts[1];
    };

    CapacitorElm.prototype.reset = function() {
      this.current = this.curcount = 0;
      return this.voltDiff = 1e-3;
    };

    CapacitorElm.prototype.getDumpType = function() {
      return "c";
    };

    CapacitorElm.prototype.dump = function() {
      return "" + CapacitorElm.__super__.dump.apply(this, arguments) + " " + this.capacitance + " " + this.voltDiff;
    };

    CapacitorElm.prototype.setPoints = function() {
      var f, _ref, _ref1;
      CapacitorElm.__super__.setPoints.call(this);
      f = (this.dn / 2 - 4) / this.dn;
      this.lead1 = DrawHelper.interpPoint(this.point1, this.point2, f);
      this.lead2 = DrawHelper.interpPoint(this.point1, this.point2, 1 - f);
      this.plate1 = [new Point(), new Point()];
      this.plate2 = [new Point(), new Point()];
      _ref = DrawHelper.interpPoint2(this.point1, this.point2, f, 12), this.plate1[0] = _ref[0], this.plate1[1] = _ref[1];
      return _ref1 = DrawHelper.interpPoint2(this.point1, this.point2, 1 - f, 12), this.plate2[0] = _ref1[0], this.plate2[1] = _ref1[1], _ref1;
    };

    CapacitorElm.prototype.draw = function(renderContext) {
      var color, hs;
      hs = 12;
      this.setBboxPt(this.point1, this.point2, hs);
      color = DrawHelper.getVoltageColor(this.volts[0]);
      renderContext.drawThickLinePt(this.point1, this.lead1, color);
      renderContext.drawThickLinePt(this.plate1[0], this.plate1[1], color);
      color = DrawHelper.getVoltageColor(this.volts[1]);
      renderContext.drawThickLinePt(this.point2, this.lead2, color);
      renderContext.drawThickLinePt(this.plate2[0], this.plate2[1], color);
      this.drawDots(this.point1, this.lead1, renderContext);
      this.drawDots(this.lead2, this.point2, renderContext);
      return this.drawPosts(renderContext);
    };

    CapacitorElm.prototype.drawUnits = function() {
      var s;
      s = DrawHelper.getUnitText(this.capacitance, "F");
      return this.drawValues(s, hs);
    };

    CapacitorElm.prototype.doStep = function(stamper) {
      return stamper.stampCurrentSource(this.nodes[0], this.nodes[1], this.curSourceValue);
    };

    CapacitorElm.prototype.stamp = function(stamper) {
      if (this.isTrapezoidal()) {
        this.compResistance = this.timeStep() / (2 * this.capacitance);
      } else {
        this.compResistance = this.timeStep() / this.capacitance;
      }
      stamper.stampResistor(this.nodes[0], this.nodes[1], this.compResistance);
      stamper.stampRightSide(this.nodes[0]);
      stamper.stampRightSide(this.nodes[1]);
    };

    CapacitorElm.prototype.startIteration = function() {
      if (this.isTrapezoidal()) {
        this.curSourceValue = -this.voltDiff / this.compResistance - this.current;
      } else {
        this.curSourceValue = -this.voltDiff / this.compResistance;
      }
    };

    CapacitorElm.prototype.calculateCurrent = function() {
      var vdiff;
      vdiff = this.volts[0] - this.volts[1];
      if (this.compResistance > 0) {
        return this.current = vdiff / this.compResistance + this.curSourceValue;
      }
    };

    CapacitorElm.prototype.getInfo = function(arr) {
      var v;
      CapacitorElm.__super__.getInfo.call(this);
      arr[0] = "capacitor";
      this.getBasicInfo(arr);
      arr[3] = "C = " + DrawHelper.getUnitText(this.capacitance, "F");
      arr[4] = "P = " + DrawHelper.getUnitText(this.getPower(), "W");
      v = this.getVoltageDiff();
      return arr[4] = "U = " + DrawHelper.getUnitText(.5 * this.capacitance * v * v, "J");
    };

    CapacitorElm.prototype.getEditInfo = function(n) {
      var ei;
      if (n === 0) {
        return new EditInfo("Capacitance (F)", this.capacitance, 0, 0);
      }
      if (n === 1) {
        ei = new EditInfo("", 0, -1, -1);
        ei.checkbox = "Trapezoidal Approximation";
        return ei;
      }
      return null;
    };

    CapacitorElm.prototype.setEditValue = function(n, ei) {
      if (n === 0 && ei.value > 0) {
        this.capacitance = ei.value;
      }
      if (n === 1) {
        if (ei.isChecked) {
          return this.flags &= ~CapacitorElm.FLAG_BACK_EULER;
        } else {
          return this.flags |= CapacitorElm.FLAG_BACK_EULER;
        }
      }
    };

    CapacitorElm.prototype.needsShortcut = function() {
      return true;
    };

    CapacitorElm.prototype.toString = function() {
      return "CapacitorElm";
    };

    return CapacitorElm;

  })(CircuitComponent);

  module.exports = CapacitorElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],28:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, InductorElm, Point, Polygon, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  InductorElm = (function(_super) {
    __extends(InductorElm, _super);

    InductorElm.FLAG_BACK_EULER = 2;

    function InductorElm(xa, ya, xb, yb, f, st) {
      InductorElm.__super__.constructor.call(this, xa, ya, xb, yb, f);
      this.inductance = 0;
      this.nodes = new Array(2);
      this.flags = 0;
      this.compResistance = 0;
      this.current = 0;
      this.curSourceValue = 0;
      if (st) {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        this.inductance = parseFloat(st[0]);
        this.current = parseFloat(st[1]);
      }
    }

    InductorElm.prototype.stamp = function(stamper) {
      var ts;
      ts = this.getParentCircuit().timeStep();
      console.log(ts);
      console.log(this.inductance);
      if (this.isTrapezoidal()) {
        this.compResistance = 2 * this.inductance / ts;
      } else {
        this.compResistance = this.inductance / ts;
      }
      stamper.stampResistor(this.nodes[0], this.nodes[1], this.compResistance);
      stamper.stampRightSide(this.nodes[0]);
      return stamper.stampRightSide(this.nodes[1]);
    };

    InductorElm.prototype.doStep = function(stamper) {
      return stamper.stampCurrentSource(this.nodes[0], this.nodes[1], this.curSourceValue);
    };

    InductorElm.prototype.draw = function(renderContext) {
      var hs, unit_text, v1, v2;
      v1 = this.volts[0];
      v2 = this.volts[1];
      hs = 8;
      this.setBboxPt(this.point1, this.point2, hs);
      this.draw2Leads(renderContext);
      DrawHelper.drawCoil(8, this.lead1, this.lead2, v1, v2, renderContext);
      unit_text = DrawHelper.getUnitText(this.inductance, "H");
      this.drawValues(unit_text, hs, renderContext);
      this.drawPosts(renderContext);
      return this.drawDots(this.point1, this.point2, renderContext);
    };

    InductorElm.prototype.dump = function() {
      return "" + (InductorElm.__super__.dump.call(this)) + " " + this.inductance + " " + this.current;
    };

    InductorElm.prototype.getDumpType = function() {
      return "l";
    };

    InductorElm.prototype.startIteration = function() {
      if (this.isTrapezoidal()) {
        return this.curSourceValue = this.getVoltageDiff() / this.compResistance + this.current;
      } else {
        return this.curSourceValue = this.current;
      }
    };

    InductorElm.prototype.nonLinear = function() {
      return false;
    };

    InductorElm.prototype.isTrapezoidal = function() {
      return (this.flags & InductorElm.FLAG_BACK_EULER) === 0;
    };

    InductorElm.prototype.calculateCurrent = function() {
      if (this.compResistance > 0) {
        this.current = this.getVoltageDiff() / this.compResistance + this.curSourceValue;
      }
      return this.current;
    };

    InductorElm.prototype.getInfo = function(arr) {
      arr[0] = "inductor";
      this.getBasicInfo(arr);
      arr[3] = "L = " + DrawHelper.getUnitText(this.inductance, "H");
      return arr[4] = "P = " + DrawHelper.getUnitText(this.getPower(), "W");
    };

    InductorElm.prototype.reset = function() {
      this.current = 0;
      this.volts[0] = 0;
      this.volts[1] = 0;
      return this.curcount = 0;
    };

    InductorElm.prototype.getVoltageDiff = function() {
      return this.volts[0] - this.volts[1];
    };

    InductorElm.prototype.toString = function() {
      return "InductorElm";
    };

    InductorElm.prototype.getEditInfo = function(n) {
      var ei;
      if (n === 0) {
        return new EditInfo("Inductance (H)", this.inductance, 0, 0);
      }
      if (n === 1) {
        ei = new EditInfo("", 0, -1, -1);
        ei.checkbox = "Trapezoidal Approximation";
        return ei;
      }
      return null;
    };

    InductorElm.prototype.setEditValue = function(n, ei) {
      if (n === 0) {
        this.inductance = ei.value;
      }
      if (n === 1) {
        if (ei.checkbox.getState()) {
          return this.flags &= ~Inductor.FLAG_BACK_EULER;
        } else {
          return this.flags |= Inductor.FLAG_BACK_EULER;
        }
      }
    };

    InductorElm.prototype.setPoints = function() {
      InductorElm.__super__.setPoints.call(this);
      return this.calcLeads(32);
    };

    return InductorElm;

  })(CircuitComponent);

  module.exports = InductorElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],29:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, Rectangle, Settings, SparkGapElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  SparkGapElm = (function(_super) {
    __extends(SparkGapElm, _super);

    function SparkGapElm(xa, ya, xb, yb, f, st) {
      SparkGapElm.__super__.constructor.call(this, xa, ya, xb, yb, f);
      this.resistance = 0;
      this.offresistance = 1e9;
      this.onresistance = 1e3;
      this.breakdown = 1e3;
      this.holdcurrent = 0.001;
      this.state = false;
      if (st) {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        if (st) {
          this.onresistance = parseFloat(st != null ? st.shift() : void 0);
        }
        if (st) {
          this.offresistance = parseFloat(st != null ? st.shift() : void 0);
        }
        if (st) {
          this.breakdown = parseFloat(st != null ? st.shift() : void 0);
        }
        if (st) {
          this.holdcurrent = parseFloat(st != null ? st.shift() : void 0);
        }
      }
    }

    SparkGapElm.prototype.nonLinear = function() {
      return true;
    };

    SparkGapElm.prototype.getDumpType = function() {
      return 187;
    };

    SparkGapElm.prototype.dump = function() {
      return "" + (SparkGapElm.__super__.dump.call(this)) + " " + this.onresistance + " " + this.offresistance + " " + this.breakdown + " " + this.holdcurrent;
    };

    SparkGapElm.prototype.setPoints = function() {
      var alen, dist;
      SparkGapElm.__super__.setPoints.call(this);
      dist = 16;
      alen = 8;
      return this.calcLeads(dist + alen);
    };

    SparkGapElm.prototype.calculateCurrent = function() {
      return this.current = (this.volts[0] - this.volts[1]) / this.resistance;
    };

    SparkGapElm.prototype.reset = function() {
      SparkGapElm.__super__.reset.call(this);
      return this.state = false;
    };

    SparkGapElm.prototype.startIteration = function() {
      var vd;
      if (Math.abs(this.current) < this.holdcurrent) {
        this.state = false;
      }
      vd = this.volts[0] - this.volts[1];
      if (Math.abs(vd) > this.breakdown) {
        return this.state = true;
      }
    };

    SparkGapElm.prototype.doStep = function(stamper) {
      if (this.state) {
        console.log("SPARK!");
        this.resistance = this.onresistance;
      } else {
        this.resistance = this.offresistance;
      }
      return stamper.stampResistor(this.nodes[0], this.nodes[1], this.resistance);
    };

    SparkGapElm.prototype.toString = function() {
      return "SparkGapElm";
    };

    SparkGapElm.prototype.stamp = function(stamper) {
      stamper.stampNonLinear(this.nodes[0]);
      return stamper.stampNonLinear(this.nodes[1]);
    };

    SparkGapElm.prototype.getInfo = function(arr) {
      arr[0] = "spark gap";
      this.getBasicInfo(arr);
      arr[3] = (this.state ? "on" : "off");
      arr[4] = "Ron = " + DrawHelper.getUnitText(this.onresistance, Circuit.ohmString);
      arr[5] = "Roff = " + DrawHelper.getUnitText(this.offresistance, Circuit.ohmString);
      return arr[6] = "Vbreakdown = " + DrawHelper.getUnitText(this.breakdown, "V");
    };

    SparkGapElm.prototype.needsShortcut = function() {
      return false;
    };

    return SparkGapElm;

  })(CircuitComponent);

  module.exports = SparkGapElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],30:[function(require,module,exports){
(function() {
  var CircuitComponent, CurrentElm, DrawHelper, Point, Polygon, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  CurrentElm = (function(_super) {
    __extends(CurrentElm, _super);

    function CurrentElm(xa, ya, xb, yb, f, st) {
      var e;
      CurrentElm.__super__.constructor.call(this, xa, ya, xb, yb, f);
      try {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        this.currentValue || (this.currentValue = parseFloat(st[0]));
      } catch (_error) {
        e = _error;
        this.currentValue = .01;
      }
    }

    CurrentElm.prototype.dump = function() {
      return CurrentElm.__super__.dump.call(this) + " " + this.currentValue;
    };

    CurrentElm.prototype.getDumpType = function() {
      return "i";
    };

    CurrentElm.prototype.setPoints = function() {
      var p2;
      CurrentElm.__super__.setPoints.call(this);
      this.calcLeads(26);
      this.ashaft1 = DrawHelper.interpPoint(this.lead1, this.lead2, .25);
      this.ashaft2 = DrawHelper.interpPoint(this.lead1, this.lead2, .6);
      this.center = DrawHelper.interpPoint(this.lead1, this.lead2, .5);
      p2 = DrawHelper.interpPoint(this.lead1, this.lead2, .75);
      return this.arrow = DrawHelper.calcArrow(this.center, p2, 4, 4);
    };

    CurrentElm.prototype.draw = function(renderContext) {
      var color, cr;
      cr = 12;
      this.draw2Leads(renderContext);
      color = DrawHelper.getVoltageColor((this.volts[0] + this.volts[1]) / 2);
      renderContext.drawCircle(this.center.x, this.center.y, cr);
      renderContext.drawCircle(this.ashaft1, this.ashaft2);
      renderContext.fillPolygon(this.arrow);
      renderContext.setBboxPt(this.point1, this.point2, cr);
      this.drawPosts(renderContext);
      return this.doDots(renderContext);
    };

    CurrentElm.prototype.stamp = function(stamper) {
      this.current = this.currentValue;
      return stamper.stampCurrentSource(this.nodes[0], this.nodes[1], this.current);
    };

    CurrentElm.prototype.getInfo = function(arr) {
      CurrentElm.__super__.getInfo.call(this);
      arr[0] = "current source";
      return this.getBasicInfo(arr);
    };

    CurrentElm.prototype.getVoltageDiff = function() {
      return this.volts[1] - this.volts[0];
    };

    return CurrentElm;

  })(CircuitComponent);

  module.exports = CurrentElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],31:[function(require,module,exports){
(function() {
  var AntennaElm, CircuitComponent, DrawHelper, Point, Polygon, RailElm, Rectangle, Settings, VoltageElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  VoltageElm = require('./VoltageElm.coffee');

  AntennaElm = require('./AntennaElm.coffee');

  RailElm = (function(_super) {
    __extends(RailElm, _super);

    RailElm.FLAG_CLOCK = 1;

    function RailElm(xa, ya, xb, yb, f, st) {
      RailElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
    }

    RailElm.prototype.getDumpType = function() {
      return "R";
    };

    RailElm.prototype.getPostCount = function() {
      return 1;
    };

    RailElm.prototype.setPoints = function() {
      RailElm.__super__.setPoints.call(this);
      return this.lead1 = DrawHelper.interpPoint(this.point1, this.point2, 1 - VoltageElm.circleSize / this.dn);
    };

    RailElm.prototype.draw = function(renderContext) {
      var clock, color, s, v;
      this.setBboxPt(this.point1, this.point2, this.circleSize);
      color = DrawHelper.getVoltageColor(this.volts[0]);
      renderContext.drawThickLinePt(this.point1, this.lead1, color);
      clock = this.waveform === VoltageElm.WF_SQUARE && (this.flags & VoltageElm.FLAG_CLOCK) !== 0;
      if (this.waveform === VoltageElm.WF_DC || this.waveform === VoltageElm.WF_VAR || clock) {
        color = (this.needsHighlight() ? Settings.SELECT_COLOR : "#FFFFFF");
        v = this.getVoltage();
        s = DrawHelper.getShortUnitText(v, "V");
        if (Math.abs(v) < 1) {
          s = v + "V";
        }
        if (this.getVoltage() > 0) {
          s = "+" + s;
        }
        if (this instanceof AntennaElm) {
          s = "Ant";
        }
        if (clock) {
          s = "CLK";
        }
        this.drawCenteredText(s, this.x2, this.y2, true, renderContext);
      } else {
        this.drawWaveform(this.point2, renderContext);
      }
      this.drawPosts(renderContext);
      return this.drawDots(this.point1, this.lead1, renderContext);
    };

    RailElm.prototype.getVoltageDiff = function() {
      return this.volts[0];
    };

    RailElm.prototype.stamp = function(stamper) {
      if (this.waveform === VoltageElm.WF_DC) {
        return stamper.stampVoltageSource(0, this.nodes[0], this.voltSource, this.getVoltage());
      } else {
        return stamper.stampVoltageSource(0, this.nodes[0], this.voltSource);
      }
    };

    RailElm.prototype.doStep = function(stamper) {
      if (this.waveform !== VoltageElm.WF_DC) {
        return stamper.updateVoltageSource(0, this.nodes[0], this.voltSource, this.getVoltage());
      }
    };

    RailElm.prototype.hasGroundConnection = function(n1) {
      return true;
    };

    return RailElm;

  })(VoltageElm);

  module.exports = RailElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15,"./VoltageElm.coffee":23,"./AntennaElm.coffee":51}],32:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, MosfetElm, Point, Polygon, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  MosfetElm = (function(_super) {
    __extends(MosfetElm, _super);

    MosfetElm.FLAG_PNP = 1;

    MosfetElm.FLAG_SHOWVT = 2;

    MosfetElm.FLAG_DIGITAL = 4;

    function MosfetElm(xa, ya, xb, yb, f, st) {
      MosfetElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
      this.lastv1 = 0;
      this.lastv2 = 0;
      this.ids = 0;
      this.mode = 0;
      this.gm = 0;
      this.vt = 1.5;
      this.pcircler = 3;
      this.src = [];
      this.drn = [];
      this.gate = [];
      this.pcircle = [];
      this.pnp = ((f & MosfetElm.FLAG_PNP) !== 0 ? -1 : 1);
      this.noDiagonal = true;
      this.vt = this.getDefaultThreshold();
      this.hs = 16;
      if (st && st.length > 0) {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        this.vt || (this.vt = st[0]);
      }
    }

    MosfetElm.prototype.getDefaultThreshold = function() {
      return 1.5;
    };

    MosfetElm.prototype.getBeta = function() {
      return .02;
    };

    MosfetElm.prototype.nonLinear = function() {
      return true;
    };

    MosfetElm.prototype.toString = function() {
      return "MosfetElm";
    };

    MosfetElm.prototype.drawDigital = function() {
      return (this.flags & MosfetElm.FLAG_DIGITAL) !== 0;
    };

    MosfetElm.prototype.reset = function() {
      return this.lastv1 = this.lastv2 = this.volts[0] = this.volts[1] = this.volts[2] = this.curcount = 0;
    };

    MosfetElm.prototype.dump = function() {
      return MosfetElm.__super__.dump.call(this) + " " + this.vt;
    };

    MosfetElm.prototype.getDumpType = function() {
      return "f";
    };

    MosfetElm.prototype.draw = function(renderContext) {
      var color, i, ps1, ps2, s, segf, segments, v, _i;
      this.setBboxPt(this.point1, this.point2, this.hs);
      color = DrawHelper.getVoltageColor(this.volts[1]);
      renderContext.drawThickLinePt(this.src[0], this.src[1], color);
      color = DrawHelper.getVoltageColor(this.volts[2]);
      renderContext.drawThickLinePt(this.drn[0], this.drn[1], color);
      segments = 6;
      segf = 1.0 / segments;
      for (i = _i = 0; 0 <= segments ? _i < segments : _i > segments; i = 0 <= segments ? ++_i : --_i) {
        v = this.volts[1] + (this.volts[2] - this.volts[1]) * i / segments;
        color = DrawHelper.getVoltageColor(v);
        ps1 = DrawHelper.interpPoint(this.src[1], this.drn[1], i * segf);
        ps2 = DrawHelper.interpPoint(this.src[1], this.drn[1], (i + 1) * segf);
        renderContext.drawThickLinePt(ps1, ps2, color);
      }
      color = DrawHelper.getVoltageColor(this.volts[1]);
      renderContext.drawThickLinePt(this.src[1], this.src[2], color);
      color = DrawHelper.getVoltageColor(this.volts[2]);
      renderContext.drawThickLinePt(this.drn[1], this.drn[2], color);
      if (!this.drawDigital()) {
        color = DrawHelper.getVoltageColor((this.pnp === 1 ? this.volts[1] : this.volts[2]));
        renderContext.drawThickPolygonP(this.arrowPoly, color);
      }
      renderContext.drawThickPolygonP(this.arrowPoly);
      color = DrawHelper.getVoltageColor(this.volts[0]);
      renderContext.drawThickLinePt(this.point1, this.gate[1], color);
      renderContext.drawThickLinePt(this.gate[0], this.gate[2], color);
      this.drawDigital() && this.pnp === -1;
      if ((this.flags & MosfetElm.FLAG_SHOWVT) !== 0) {
        s = "" + (this.vt * this.pnp);
      }
      this.drawDots(this.src[0], this.src[1], renderContext);
      this.drawDots(this.src[1], this.drn[1], renderContext);
      this.drawDots(this.drn[1], this.drn[0], renderContext);
      return this.drawPosts(renderContext);
    };

    MosfetElm.prototype.getPost = function(n) {
      if (n === 0) {
        return this.point1;
      } else {
        if (n === 1) {
          return this.src[0];
        } else {
          return this.drn[0];
        }
      }
    };

    MosfetElm.prototype.getCurrent = function() {
      return this.ids;
    };

    MosfetElm.prototype.getPower = function() {
      return this.ids * (this.volts[2] - this.volts[1]);
    };

    MosfetElm.prototype.getPostCount = function() {
      return 3;
    };

    MosfetElm.prototype.setPoints = function() {
      var dist, hs2, _ref, _ref1, _ref2, _ref3;
      MosfetElm.__super__.setPoints.call(this);
      hs2 = this.hs * this.dsign;
      this.src = CircuitComponent.newPointArray(3);
      this.drn = CircuitComponent.newPointArray(3);
      _ref = DrawHelper.interpPoint2(this.point1, this.point2, 1, -hs2), this.src[0] = _ref[0], this.drn[0] = _ref[1];
      _ref1 = DrawHelper.interpPoint2(this.point1, this.point2, 1 - 22 / this.dn, -hs2), this.src[1] = _ref1[0], this.drn[1] = _ref1[1];
      _ref2 = DrawHelper.interpPoint2(this.point1, this.point2, 1 - 22 / this.dn, -hs2 * 4 / 3), this.src[2] = _ref2[0], this.drn[2] = _ref2[1];
      this.gate = CircuitComponent.newPointArray(3);
      _ref3 = DrawHelper.interpPoint2(this.point1, this.point2, 1 - 28 / this.dn, hs2 / 2), this.gate[0] = _ref3[0], this.gate[2] = _ref3[1];
      this.gate[1] = DrawHelper.interpPoint(this.gate[0], this.gate[2], .5);
      console.log("GATE: " + this.gate[1]);
      if (!this.drawDigital()) {
        if (this.pnp === 1) {
          return this.arrowPoly = DrawHelper.calcArrow(this.src[1], this.src[0], 10, 4);
        } else {
          return this.arrowPoly = DrawHelper.calcArrow(this.drn[0], this.drn[1], 12, 5);
        }
      } else if (this.pnp === -1) {
        this.gate[1] = DrawHelper.interpPoint(this.point1, this.point2, 1 - 36 / this.dn);
        dist = (this.dsign < 0 ? 32 : 31);
        this.pcircle = DrawHelper.interpPoint(this.point1, this.point2, 1 - dist / this.dn);
        return this.pcircler = 3;
      }
    };

    MosfetElm.prototype.stamp = function(stamper) {
      stamper.stampNonLinear(this.nodes[1]);
      return stamper.stampNonLinear(this.nodes[2]);
    };

    MosfetElm.prototype.doStep = function(stamper) {
      var Gds, beta, drain_node, gate, realvds, realvgs, rs, source_node, vds, vgs, vs;
      vs = new Array(3);
      vs[0] = this.volts[0];
      vs[1] = this.volts[1];
      vs[2] = this.volts[2];
      if (vs[1] > this.lastv1 + .5) {
        vs[1] = this.lastv1 + .5;
      }
      if (vs[1] < this.lastv1 - .5) {
        vs[1] = this.lastv1 - .5;
      }
      if (vs[2] > this.lastv2 + .5) {
        vs[2] = this.lastv2 + .5;
      }
      if (vs[2] < this.lastv2 - .5) {
        vs[2] = this.lastv2 - .5;
      }
      source_node = 1;
      drain_node = 2;
      if (this.pnp * vs[1] > this.pnp * vs[2]) {
        source_node = 2;
        drain_node = 1;
      }
      gate = 0;
      vgs = vs[gate] - vs[source_node];
      vds = vs[drain_node] - vs[source_node];
      if (Math.abs(this.lastv1 - vs[1]) > .01 || Math.abs(this.lastv2 - vs[2]) > .01) {
        this.getParentCircuit().converged = false;
      }
      this.lastv1 = vs[1];
      this.lastv2 = vs[2];
      realvgs = vgs;
      realvds = vds;
      vgs *= this.pnp;
      vds *= this.pnp;
      this.ids = 0;
      this.gm = 0;
      Gds = 0;
      beta = this.getBeta();
      if (vgs > .5 && this instanceof JFetElm) {
        Circuit.halt("JFET is reverse biased!", this);
        return;
      }
      if (vgs < this.vt) {
        Gds = 1e-8;
        this.ids = vds * Gds;
        this.mode = 0;
      } else if (vds < vgs - this.vt) {
        this.ids = beta * ((vgs - this.vt) * vds - vds * vds * .5);
        this.gm = beta * vds;
        Gds = beta * (vgs - vds - this.vt);
        this.mode = 1;
      } else {
        this.gm = beta * (vgs - this.vt);
        Gds = 1e-8;
        this.ids = .5 * beta * (vgs - this.vt) * (vgs - this.vt) + (vds - (vgs - this.vt)) * Gds;
        this.mode = 2;
      }
      rs = -this.pnp * this.ids + Gds * realvds + this.gm * realvgs;
      stamper.stampMatrix(this.nodes[drain_node], this.nodes[drain_node], Gds);
      stamper.stampMatrix(this.nodes[drain_node], this.nodes[source_node], -Gds - this.gm);
      stamper.stampMatrix(this.nodes[drain_node], this.nodes[gate], this.gm);
      stamper.stampMatrix(this.nodes[source_node], this.nodes[drain_node], -Gds);
      stamper.stampMatrix(this.nodes[source_node], this.nodes[source_node], Gds + this.gm);
      stamper.stampMatrix(this.nodes[source_node], this.nodes[gate], -this.gm);
      stamper.stampRightSide(this.nodes[drain_node], rs);
      stamper.stampRightSide(this.nodes[source_node], -rs);
      if ((source_node === 2 && this.pnp === 1) || (source_node === 1 && this.pnp === -1)) {
        return this.ids = -this.ids;
      }
    };

    MosfetElm.prototype.getFetInfo = function(arr, n) {
      arr[0] = (this.pnp === -1 ? "p-" : "n-") + n;
      arr[0] += " (Vt = " + DrawHelper.getVoltageText(this.pnp * this.vt) + ")";
      arr[1] = (this.pnp === 1 ? "Ids = " : "Isd = ") + DrawHelper.getCurrentText(this.ids);
      arr[2] = "Vgs = " + DrawHelper.getVoltageText(this.volts[0] - this.volts[(this.pnp === -1 ? 2 : 1)]);
      arr[3] = (this.pnp === 1 ? "Vds = " : "Vsd = ") + DrawHelper.getVoltageText(this.volts[2] - this.volts[1]);
      arr[4] = (this.mode === 0 ? "off" : (this.mode === 1 ? "linear" : "saturation"));
      return arr[5] = "gm = " + DrawHelper.getUnitText(this.gm, "A/V");
    };

    MosfetElm.prototype.getInfo = function(arr) {
      return this.getFetInfo(arr, "MOSFET");
    };

    MosfetElm.prototype.canViewInScope = function() {
      return true;
    };

    MosfetElm.prototype.getVoltageDiff = function() {
      return this.volts[2] - this.volts[1];
    };

    MosfetElm.prototype.getConnection = function(n1, n2) {
      return !(n1 === 0 || n2 === 0);
    };

    return MosfetElm;

  })(CircuitComponent);

  module.exports = MosfetElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],33:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, Rectangle, Settings, TransistorElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  TransistorElm = (function(_super) {
    __extends(TransistorElm, _super);

    TransistorElm.FLAG_FLIP = 1;

    function TransistorElm(xa, ya, xb, yb, f, st) {
      var beta, lastvbc, lastvbe, pnp;
      TransistorElm.__super__.constructor.call(this, xa, ya, xb, yb, f);
      this.beta = 100;
      this.rect = [];
      this.coll = [];
      this.emit = [];
      this.base = new Point();
      this.pnp = 0;
      this.gmin = 0;
      this.ie = 0;
      this.ic = 0;
      this.ib = 0;
      this.rectPoly = 0;
      this.arrowPoly = 0;
      this.vt = .025;
      this.vdcoef = 1 / this.vt;
      this.rgain = .5;
      this.lastvbc = 0;
      this.lastvbe = 0;
      this.leakage = 1e-13;
      if (st && st.length > 0) {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        pnp = st.shift();
        if (pnp) {
          this.pnp = parseInt(pnp);
        }
        lastvbe = st.shift();
        if (lastvbe) {
          this.lastvbe = parseFloat(lastvbe);
        }
        lastvbc = st.shift();
        if (lastvbc) {
          this.lastvbc = parseFloat(lastvbc);
        }
        beta = st.shift();
        if (beta) {
          this.beta = parseFloat(beta);
        }
      }
      this.volts[0] = 0;
      this.volts[1] = -this.lastvbe;
      this.volts[2] = -this.lastvbc;
      this.setup();
    }

    TransistorElm.prototype.setup = function() {
      this.vcrit = this.vt * Math.log(this.vt / (Math.sqrt(2) * this.leakage));
      this.fgain = this.beta / (this.beta + 1);
      return this.noDiagonal = true;
    };

    TransistorElm.prototype.nonLinear = function() {
      return true;
    };

    TransistorElm.prototype.reset = function() {
      this.volts[0] = this.volts[1] = this.volts[2] = 0;
      return this.lastvbc = this.lastvbe = this.curcount_c = this.curcount_e = this.curcount_b = 0;
    };

    TransistorElm.prototype.getDumpType = function() {
      return "t";
    };

    TransistorElm.prototype.dump = function() {
      return TransistorElm.__super__.dump.call(this) + " " + this.pnp + " " + (this.volts[0] - this.volts[1]) + " " + (this.volts[0] - this.volts[2]) + " " + this.beta;
    };

    TransistorElm.prototype.draw = function(renderContext) {
      var color;
      this.setBboxPt(this.point1, this.point2, 16);
      color = DrawHelper.getVoltageColor(this.volts[1]);
      renderContext.drawThickLinePt(this.coll[0], this.coll[1], color);
      color = DrawHelper.getVoltageColor(this.volts[2]);
      renderContext.drawThickLinePt(this.emit[0], this.emit[1], color);
      color = DrawHelper.getVoltageColor(this.volts[0]);
      renderContext.drawThickLinePt(this.point1, this.base, color);
      this.drawDots(this.base, this.point1, renderContext);
      this.drawDots(this.coll[1], this.coll[0], renderContext);
      this.drawDots(this.emit[1], this.emit[0], renderContext);
      color = DrawHelper.getVoltageColor(this.volts[0]);
      renderContext.drawThickPolygonP(this.rectPoly, color);
      return this.drawPosts(renderContext);
    };

    TransistorElm.prototype.getPost = function(n) {
      if (n === 0) {
        return this.point1;
      } else {
        if (n === 1) {
          return this.coll[0];
        } else {
          return this.emit[0];
        }
      }
    };

    TransistorElm.prototype.getPostCount = function() {
      return 3;
    };

    TransistorElm.prototype.getPower = function() {
      return (this.volts[0] - this.volts[2]) * this.ib + (this.volts[1] - this.volts[2]) * this.ic;
    };

    TransistorElm.prototype.setPoints = function(stamper) {
      var hs, hs2, pt, _ref, _ref1, _ref2, _ref3;
      TransistorElm.__super__.setPoints.call(this);
      hs = 16;
      if ((this.flags & TransistorElm.FLAG_FLIP) !== 0) {
        this.dsign = -this.dsign;
      }
      hs2 = hs * this.dsign * this.pnp;
      this.coll = CircuitComponent.newPointArray(2);
      this.emit = CircuitComponent.newPointArray(2);
      _ref = DrawHelper.interpPoint2(this.point1, this.point2, 1, hs2), this.coll[0] = _ref[0], this.emit[0] = _ref[1];
      this.rect = CircuitComponent.newPointArray(4);
      _ref1 = DrawHelper.interpPoint2(this.point1, this.point2, 1 - 16 / this.dn, hs), this.rect[0] = _ref1[0], this.rect[1] = _ref1[1];
      _ref2 = DrawHelper.interpPoint2(this.point1, this.point2, 1 - 13 / this.dn, hs), this.rect[2] = _ref2[0], this.rect[3] = _ref2[1];
      _ref3 = DrawHelper.interpPoint2(this.point1, this.point2, 1 - 13 / this.dn, 6 * this.dsign * this.pnp), this.coll[1] = _ref3[0], this.emit[1] = _ref3[1];
      this.base = new Point();
      this.base = DrawHelper.interpPoint(this.point1, this.point2, 1 - 16 / this.dn);
      this.rectPoly = DrawHelper.createPolygon(this.rect[0], this.rect[2], this.rect[3], this.rect[1]);
      if (this.pnp !== 1) {
        pt = DrawHelper.interpPoint(this.point1, this.point2, 1 - 11 / this.dn, -5 * this.dsign * this.pnp);
        return this.arrowPoly = DrawHelper.calcArrow(this.emit[0], pt, 8, 4);
      }
    };

    TransistorElm.prototype.limitStep = function(vnew, vold) {
      var arg, oo;
      arg = 0;
      oo = vnew;
      if (vnew > this.vcrit && Math.abs(vnew - vold) > (this.vt + this.vt)) {
        if (vold > 0) {
          arg = 1 + (vnew - vold) / this.vt;
          if (arg > 0) {
            vnew = vold + this.vt * Math.log(arg);
          } else {
            vnew = this.vcrit;
          }
        } else {
          vnew = this.vt * Math.log(vnew / this.vt);
        }
        this.getParentCircuit().converged = false;
      }
      return vnew;
    };

    TransistorElm.prototype.stamp = function(stamper) {
      stamper.stampNonLinear(this.nodes[0]);
      stamper.stampNonLinear(this.nodes[1]);
      return stamper.stampNonLinear(this.nodes[2]);
    };

    TransistorElm.prototype.doStep = function(stamper) {
      var expbc, expbe, gcc, gce, gec, gee, pcoef, subIterations, vbc, vbe;
      subIterations = this.getParentCircuit().Solver.subIterations;
      vbc = this.volts[0] - this.volts[1];
      vbe = this.volts[0] - this.volts[2];
      if (Math.abs(vbc - this.lastvbc) > .01 || Math.abs(vbe - this.lastvbe) > .01) {
        this.getParentCircuit.converged = false;
      }
      this.gmin = 0;
      if (subIterations > 100) {
        this.gmin = Math.exp(-9 * Math.log(10) * (1 - subIterations / 3000.0));
        if (this.gmin > .1) {
          this.gmin = .1;
        }
      }
      vbc = this.pnp * this.limitStep(this.pnp * vbc, this.pnp * this.lastvbc);
      vbe = this.pnp * this.limitStep(this.pnp * vbe, this.pnp * this.lastvbe);
      this.lastvbc = vbc;
      this.lastvbe = vbe;
      pcoef = this.vdcoef * this.pnp;
      expbc = Math.exp(vbc * pcoef);
      expbe = Math.exp(vbe * pcoef);
      if (expbe < 1) {
        expbe = 1;
      }
      this.ie = this.pnp * this.leakage * (-(expbe - 1) + this.rgain * (expbc - 1));
      this.ic = this.pnp * this.leakage * (this.fgain * (expbe - 1) - (expbc - 1));
      this.ib = -(this.ie + this.ic);
      gee = -this.leakage * this.vdcoef * expbe;
      gec = this.rgain * this.leakage * this.vdcoef * expbc;
      gce = -gee * this.fgain;
      gcc = -gec * (1 / this.rgain);
      stamper.stampMatrix(this.nodes[0], this.nodes[0], -gee - gec - gce - gcc + this.gmin * 2);
      stamper.stampMatrix(this.nodes[0], this.nodes[1], gec + gcc - this.gmin);
      stamper.stampMatrix(this.nodes[0], this.nodes[2], gee + gce - this.gmin);
      stamper.stampMatrix(this.nodes[1], this.nodes[0], gce + gcc - this.gmin);
      stamper.stampMatrix(this.nodes[1], this.nodes[1], -gcc + this.gmin);
      stamper.stampMatrix(this.nodes[1], this.nodes[2], -gce);
      stamper.stampMatrix(this.nodes[2], this.nodes[0], gee + gec - this.gmin);
      stamper.stampMatrix(this.nodes[2], this.nodes[1], -gec);
      stamper.stampMatrix(this.nodes[2], this.nodes[2], -gee + this.gmin);
      stamper.stampRightSide(this.nodes[0], -this.ib - (gec + gcc) * vbc - (gee + gce) * vbe);
      stamper.stampRightSide(this.nodes[1], -this.ic + gce * vbe + gcc * vbc);
      return stamper.stampRightSide(this.nodes[2], -this.ie + gee * vbe + gec * vbc);
    };

    TransistorElm.prototype.getInfo = function(arr) {
      var vbc, vbe, vce;
      arr[0] = "transistor (" + (this.pnp === -1 ? "PNP)" : "NPN)") + " beta=" + this.beta.toFixed(4);
      arr[0] = "";
      vbc = this.volts[0] - this.volts[1];
      vbe = this.volts[0] - this.volts[2];
      vce = this.volts[1] - this.volts[2];
      if (vbc * this.pnp > .2) {
        arr[1] = (vbe * this.pnp > .2 ? "saturation" : "reverse active");
      } else {
        arr[1] = (vbe * this.pnp > .2 ? "fwd active" : "cutoff");
      }
      arr[2] = "Ic = " + DrawHelper.getCurrentText(this.ic);
      arr[3] = "Ib = " + DrawHelper.getCurrentText(this.ib);
      arr[4] = "Vbe = " + DrawHelper.getVoltageText(vbe);
      arr[5] = "Vbc = " + DrawHelper.getVoltageText(vbc);
      return arr[6] = "Vce = " + DrawHelper.getVoltageText(vce);
    };

    TransistorElm.prototype.getScopeValue = function(x) {
      switch (x) {
        case Oscilloscope.VAL_IB:
          return this.ib;
        case Oscilloscope.VAL_IC:
          return this.ic;
        case Oscilloscope.VAL_IE:
          return this.ie;
        case Oscilloscope.VAL_VBE:
          return this.volts[0] - this.volts[2];
        case Oscilloscope.VAL_VBC:
          return this.volts[0] - this.volts[1];
        case Oscilloscope.VAL_VCE:
          return this.volts[1] - this.volts[2];
      }
      return 0;
    };

    TransistorElm.prototype.getScopeUnits = function(x) {
      switch (x) {
        case Oscilloscope.VAL_IB:
        case Oscilloscope.VAL_IC:
        case Oscilloscope.VAL_IE:
          return "A";
        default:
          return "V";
      }
    };

    TransistorElm.prototype.getEditInfo = function(n) {
      var ei;
      if (n === 0) {
        return new EditInfo("Beta/hFE", this.beta, 10, 1000).setDimensionless();
      }
      if (n === 1) {
        ei = new EditInfo("", 0, -1, -1);
        ei.checkbox = new Checkbox("Swap E/C", (this.flags & TransistorElm.FLAG_FLIP) !== 0);
        return ei;
      }
      return null;
    };

    TransistorElm.prototype.setEditValue = function(n, ei) {
      if (n === 0) {
        this.beta = ei.value;
        this.setup();
      }
      if (n === 1) {
        if (ei.checkbox.getState()) {
          this.flags |= TransistorElm.FLAG_FLIP;
        } else {
          this.flags &= ~TransistorElm.FLAG_FLIP;
        }
        return this.setPoints();
      }
    };

    TransistorElm.prototype.canViewInScope = function() {
      return true;
    };

    return TransistorElm;

  })(CircuitComponent);

  module.exports = TransistorElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],34:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, RailElm, Rectangle, Settings, VarRailElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  RailElm = require('./RailElm.coffee');

  VarRailElm = (function(_super) {
    __extends(VarRailElm, _super);

    function VarRailElm(xa, ya, xb, yb, f, st) {
      VarRailElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
      this.frequency = this.maxVoltage;
    }

    VarRailElm.prototype.dump = function() {
      return VarRailElm.__super__.dump.call(this);
    };

    VarRailElm.prototype.getDumpType = function() {
      return 172;
    };

    VarRailElm.prototype.createSlider = function() {};

    VarRailElm.prototype.getVoltageDiff = function() {
      return this.volts[0];
    };

    VarRailElm.prototype.getVoltage = function() {
      return VarRailElm.__super__.getVoltage.call(this);
    };

    VarRailElm.prototype.destroy = function() {};

    VarRailElm.prototype.getEditInfo = function(n) {
      var ei;
      if (n === 0) {
        return new EditInfo("Min Voltage", bias, -20, 20);
      }
      if (n === 1) {
        return new EditInfo("Max Voltage", maxVoltage, -20, 20);
      }
      if (n === 2) {
        ei = new EditInfo("Slider Text", 0, -1, -1);
        ei.text = sliderText;
        return ei;
      }
      return null;
    };

    VarRailElm.prototype.setEditValue = function(n, ei) {
      var bias, maxVoltage, sliderText;
      if (n === 0) {
        bias = ei.value;
      }
      if (n === 1) {
        maxVoltage = ei.value;
      }
      if (n === 2) {
        sliderText = ei.textf.getText();
        return label.setText(sliderText);
      }
    };

    return VarRailElm;

  })(RailElm);

  module.exports = VarRailElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15,"./RailElm.coffee":31}],35:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, OpAmpElm, Point, Polygon, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  OpAmpElm = (function(_super) {
    __extends(OpAmpElm, _super);

    OpAmpElm.FLAG_SWAP = 1;

    OpAmpElm.FLAG_SMALL = 2;

    OpAmpElm.FLAG_LOWGAIN = 4;

    function OpAmpElm(xa, ya, xb, yb, f, st) {
      OpAmpElm.__super__.constructor.call(this, xa, ya, xb, yb, f);
      this.opsize = 0;
      this.opwidth = 0;
      this.opaddtext = 0;
      this.maxOut = 15;
      this.minOut = -15;
      this.gain = 1e6;
      this.reset = false;
      this.in1p = [];
      this.in2p = [];
      this.textp = [];
      this.maxOut = 15;
      this.minOut = -15;
      this.gbw = 1e6;
      if (st && st.length > 0) {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        try {
          this.maxOut || (this.maxOut = parseFloat(st[0]));
          this.minOut || (this.minOut = parseFloat(st[1]));
          this.gbw || (this.gbw = parseFloat(st[2]));
        } catch (_error) {}
      }
      this.noDiagonal = true;
      this.setSize((f & OpAmpElm.FLAG_SMALL) !== 0 ? 1 : 2);
      this.setGain();
    }

    OpAmpElm.prototype.setGain = function() {
      return this.gain = ((this.flags & OpAmpElm.FLAG_LOWGAIN) !== 0 ? 1000 : 100000);
    };

    OpAmpElm.prototype.dump = function() {
      return "" + (OpAmpElm.__super__.dump.call(this)) + " " + this.maxOut + " " + this.minOut + " " + this.gbw;
    };

    OpAmpElm.prototype.nonLinear = function() {
      return true;
    };

    OpAmpElm.prototype.draw = function(renderContext) {
      var color;
      this.setBboxPt(this.point1, this.point2, this.opheight * 2);
      color = DrawHelper.getVoltageColor(this.volts[0]);
      renderContext.drawThickLinePt(this.in1p[0], this.in1p[1], color);
      color = DrawHelper.getVoltageColor(this.volts[1]);
      renderContext.drawThickLinePt(this.in2p[0], this.in2p[1], color);
      renderContext.drawThickPolygonP(this.triangle, (this.needsHighlight() ? Settings.SELECT_COLOR : Settings.FG_COLOR));
      color = DrawHelper.getVoltageColor(this.volts[2]);
      renderContext.drawThickLinePt(this.lead2, this.point2, color);
      this.drawDots(this.point2, this.lead2, renderContext);
      return this.drawPosts(renderContext);
    };

    OpAmpElm.prototype.getPower = function() {
      return this.volts[2] * this.current;
    };

    OpAmpElm.prototype.setSize = function(s) {
      this.opsize = s;
      this.opheight = 8 * s;
      this.opwidth = 13 * s;
      return this.flags = (this.flags & ~OpAmpElm.FLAG_SMALL) | (s === 1 ? OpAmpElm.FLAG_SMALL : 0);
    };

    OpAmpElm.prototype.setPoints = function() {
      var hs, tris, ww, _ref, _ref1, _ref2, _ref3;
      OpAmpElm.__super__.setPoints.call(this);
      this.setSize(2);
      if (ww > this.dn / 2) {
        ww = Math.floor(this.dn / 2);
      } else {
        ww = Math.floor(this.opwidth);
      }
      this.calcLeads(ww * 2);
      hs = Math.floor(this.opheight * this.dsign);
      if ((this.flags & OpAmpElm.FLAG_SWAP) !== 0) {
        hs = -hs;
      }
      this.in1p = CircuitComponent.newPointArray(2);
      this.in2p = CircuitComponent.newPointArray(2);
      this.textp = CircuitComponent.newPointArray(2);
      _ref = DrawHelper.interpPoint2(this.point1, this.point2, 0, hs), this.in1p[0] = _ref[0], this.in2p[0] = _ref[1];
      _ref1 = DrawHelper.interpPoint2(this.lead1, this.lead2, 0, hs), this.in1p[1] = _ref1[0], this.in2p[1] = _ref1[1];
      _ref2 = DrawHelper.interpPoint2(this.lead1, this.lead2, .2, hs), this.textp[0] = _ref2[0], this.textp[1] = _ref2[1];
      tris = CircuitComponent.newPointArray(2);
      _ref3 = DrawHelper.interpPoint2(this.lead1, this.lead2, 0, hs * 2), tris[0] = _ref3[0], tris[1] = _ref3[1];
      return this.triangle = DrawHelper.createPolygonFromArray([tris[0], tris[1], this.lead2]);
    };

    OpAmpElm.prototype.getPostCount = function() {
      return 3;
    };

    OpAmpElm.prototype.getPost = function(n) {
      if (n === 0) {
        return this.in1p[0];
      } else {
        if (n === 1) {
          return this.in2p[0];
        } else {
          return this.point2;
        }
      }
    };

    OpAmpElm.prototype.getVoltageSourceCount = function() {
      return 1;
    };

    OpAmpElm.prototype.getInfo = function(arr) {
      var vo;
      OpAmpElm.__super__.getInfo.call(this);
      arr[0] = "op-amp";
      arr[1] = "V+ = " + DrawHelper.getVoltageText(this.volts[1]);
      arr[2] = "V- = " + DrawHelper.getVoltageText(this.volts[0]);
      vo = Math.max(Math.min(this.volts[2], this.maxOut), this.minOut);
      arr[3] = "Vout = " + DrawHelper.getVoltageText(vo);
      arr[4] = "Iout = " + DrawHelper.getCurrentText(this.getCurrent());
      return arr[5] = "range = " + DrawHelper.getVoltageText(this.minOut) + " to " + DrawHelper.getVoltageText(this.maxOut);
    };

    OpAmpElm.prototype.stamp = function(stamper) {
      var vn;
      vn = this.Circuit.numNodes() + this.voltSource;
      stamper.stampNonLinear(vn);
      return stamper.stampMatrix(this.nodes[2], vn, 1);
    };

    OpAmpElm.prototype.doStep = function(stamper) {
      var dx, vd, vn, x;
      vd = this.volts[1] - this.volts[0];
      if (Math.abs(this.lastvd - vd) > .1) {
        this.Circuit.converged = false;
      } else if (this.volts[2] > this.maxOut + .1 || this.volts[2] < this.minOut - .1) {
        this.Circuit.converged = false;
      }
      x = 0;
      vn = this.Circuit.numNodes() + this.voltSource;
      dx = 0;
      if (vd >= this.maxOut / this.gain && (this.lastvd >= 0 || MathUtils.getRand(4) === 1)) {
        dx = 1e-4;
        x = this.maxOut - dx * this.maxOut / this.gain;
      } else if (vd <= this.minOut / this.gain && (this.lastvd <= 0 || MathUtils.getRand(4) === 1)) {
        dx = 1e-4;
        x = this.minOut - dx * this.minOut / this.gain;
      } else {
        dx = this.gain;
      }
      stamper.stampMatrix(vn, this.nodes[0], dx);
      stamper.stampMatrix(vn, this.nodes[1], -dx);
      stamper.stampMatrix(vn, this.nodes[2], 1);
      stamper.stampRightSide(vn, x);
      return this.lastvd = vd;
    };

    OpAmpElm.prototype.getConnection = function(n1, n2) {
      return false;
    };

    OpAmpElm.prototype.toString = function() {
      return "OpAmpElm";
    };

    OpAmpElm.prototype.hasGroundConnection = function(n1) {
      return n1 === 2;
    };

    OpAmpElm.prototype.getVoltageDiff = function() {
      return this.volts[2] - this.volts[1];
    };

    OpAmpElm.prototype.getDumpType = function() {
      return "a";
    };

    OpAmpElm.prototype.getEditInfo = function(n) {
      if (n === 0) {
        return new EditInfo("Max Output (V)", this.maxOut, 1, 20);
      }
      if (n === 1) {
        return new EditInfo("Min Output (V)", this.minOut, -20, 0);
      }
      return null;
    };

    OpAmpElm.prototype.setEditValue = function(n, ei) {
      if (n === 0) {
        this.maxOut = ei.value;
      }
      if (n === 1) {
        return this.minOut = ei.value;
      }
    };

    return OpAmpElm;

  })(CircuitComponent);

  module.exports = OpAmpElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],36:[function(require,module,exports){
(function() {
  var CircuitComponent, DiodeElm, DrawHelper, Point, Polygon, Rectangle, Settings, ZenerElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  DiodeElm = require('./DiodeElm.coffee');

  ZenerElm = (function(_super) {
    __extends(ZenerElm, _super);

    function ZenerElm(xa, ya, xb, yb, f, st) {
      ZenerElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
      this.default_z_voltage = 5.6;
      this.zvoltage = st[0] || this.default_z_voltage;
      if ((f & DiodeElm.FLAG_FWDROP) > 0) {
        try {
          this.fwdrop = st[1];
        } catch (_error) {}
      }
      this.setup();
    }

    ZenerElm.prototype.setPoints = function() {
      var pa, _ref, _ref1;
      ZenerElm.__super__.setPoints.call(this);
      this.calcLeads(16);
      pa = CircuitComponent.newPointArray(2);
      this.wing = CircuitComponent.newPointArray(2);
      _ref = DrawHelper.interpPoint2(this.lead1, this.lead2, 0, this.hs), pa[0] = _ref[0], pa[1] = _ref[1];
      _ref1 = DrawHelper.interpPoint2(this.lead1, this.lead2, 1, this.hs), this.cathode[0] = _ref1[0], this.cathode[1] = _ref1[1];
      this.wing[0] = DrawHelper.interpPoint(this.cathode[0], this.cathode[1], -0.2, -this.hs);
      this.wing[1] = DrawHelper.interpPoint(this.cathode[1], this.cathode[0], -0.2, -this.hs);
      return this.poly = DrawHelper.createPolygonFromArray([pa[0], pa[1], this.lead2]);
    };

    ZenerElm.prototype.draw = function(renderContext) {
      var color, v1, v2;
      this.setBboxPt(this.point1, this.point2, this.hs);
      v1 = this.volts[0];
      v2 = this.volts[1];
      this.draw2Leads(renderContext);
      color = DrawHelper.getVoltageColor(v1);
      renderContext.drawThickPolygonP(this.poly, color);
      renderContext.drawThickLinePt(this.cathode[0], this.cathode[1], v1);
      color = DrawHelper.getVoltageColor(v2);
      renderContext.drawThickLinePt(this.wing[0], this.cathode[0], color);
      renderContext.drawThickLinePt(this.wing[1], this.cathode[1], color);
      this.drawDots(this.point2, this.point1, renderContext);
      return this.drawPosts(renderContext);
    };

    ZenerElm.prototype.nonlinear = function() {
      return true;
    };

    ZenerElm.prototype.setup = function() {
      this.diode.leakage = 5e-6;
      return ZenerElm.__super__.setup.call(this);
    };

    ZenerElm.prototype.getDumpType = function() {
      return "z";
    };

    ZenerElm.prototype.dump = function() {
      return ZenerElm.__super__.dump.call(this) + " " + this.zvoltage;
    };

    ZenerElm.prototype.getInfo = function(arr) {
      ZenerElm.__super__.getInfo.call(this, arr);
      arr[0] = "Zener diode";
      return arr[5] = "Vz = " + DrawHelper.getVoltageText(zvoltage);
    };

    ZenerElm.prototype.getEditInfo = function() {};

    ZenerElm.prototype.setEditInfo = function() {};

    return ZenerElm;

  })(DiodeElm);

  module.exports = ZenerElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15,"./DiodeElm.coffee":24}],37:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, Rectangle, Settings, Switch2Elm, SwitchElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  SwitchElm = require('./SwitchElm.coffee');

  /*
  Todo: Click functionality does not work
  */


  Switch2Elm = (function(_super) {
    __extends(Switch2Elm, _super);

    Switch2Elm.FLAG_CENTER_OFF = 1;

    function Switch2Elm(xa, ya, xb, yb, f, st) {
      Switch2Elm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
      this.openhs = 16;
      this.noDiagonal = true;
      if (st) {
        this.link = parseInt(st[st.length - 1]);
      }
    }

    Switch2Elm.prototype.getDumpType = function() {
      return "S";
    };

    Switch2Elm.prototype.dump = function() {
      return Switch2Elm.__super__.dump.call(this) + this.link;
    };

    Switch2Elm.prototype.setPoints = function() {
      var _ref, _ref1;
      Switch2Elm.__super__.setPoints.call(this);
      this.calcLeads(32);
      this.swpoles = CircuitComponent.newPointArray(3);
      this.swposts = CircuitComponent.newPointArray(2);
      _ref = DrawHelper.interpPoint2(this.lead1, this.lead2, 1, this.openhs), this.swpoles[0] = _ref[0], this.swpoles[1] = _ref[1];
      this.swpoles[2] = this.lead2;
      _ref1 = DrawHelper.interpPoint2(this.point1, this.point2, 1, this.openhs), this.swposts[0] = _ref1[0], this.swposts[1] = _ref1[1];
      if (this.hasCenterOff()) {
        return this.posCount = 3;
      } else {
        return this.posCount = 2;
      }
    };

    Switch2Elm.prototype.draw = function(renderContext) {
      var color;
      this.setBbox(this.point1, this.point2, this.openhs);
      color = DrawHelper.getVoltageColor(this.volts[0]);
      renderContext.drawThickLinePt(this.point1, this.lead1, color);
      color = DrawHelper.getVoltageColor(this.volts[1]);
      renderContext.drawThickLinePt(this.swpoles[0], this.swposts[0], color);
      color = DrawHelper.getVoltageColor(this.volts[2]);
      renderContext.drawThickLinePt(this.swpoles[1], this.swposts[1], color);
      if (!this.needsHighlight()) {
        color = Settings.SELECT_COLOR;
      }
      renderContext.drawThickLinePt(this.lead1, this.swpoles[this.position], color);
      this.drawDots(this.point1, this.lead1, renderContext);
      if (this.position !== 2) {
        this.drawDots(this.swpoles[this.position], this.swposts[this.position], renderContext);
      }
      return this.drawPosts(renderContext);
    };

    Switch2Elm.prototype.getPost = function(n) {
      if (n === 0) {
        return this.point1;
      } else {
        return this.swposts[n - 1];
      }
    };

    Switch2Elm.prototype.getPostCount = function() {
      return 3;
    };

    Switch2Elm.prototype.calculateCurrent = function() {
      if (this.position === 2) {
        return this.current = 0;
      }
    };

    Switch2Elm.prototype.stamp = function(stamper) {
      if (this.position === 2) {
        return;
      }
      return stamper.stampVoltageSource(this.nodes[0], this.nodes[this.position + 1], this.voltSource, 0);
    };

    Switch2Elm.prototype.getVoltageSourceCount = function() {
      if (this.position === 2) {
        return 0;
      } else {
        return 1;
      }
    };

    Switch2Elm.prototype.toggle = function() {
      var i;
      Switch2Elm.__super__.toggle.call(this);
      if (this.link !== 0) {
        i = 0;
        return getParentCircuit().eachComponent(function(component) {
          var s2;
          if (component instanceof Switch2Elm) {
            s2 = component;
            if (s2.link === this.link) {
              return s2.position = this.position;
            }
          }
        });
      }
    };

    Switch2Elm.prototype.getConnection = function(n1, n2) {
      if (this.position === 2) {
        return false;
      }
      return this.comparePair(n1, n2, 0, 1 + this.position);
    };

    Switch2Elm.prototype.getInfo = function(arr) {
      arr[0] = (this.link === 0 ? "switch (SPDT)" : "switch (DPDT)");
      return arr[1] = "I = " + this.getCurrentDText(this.getCurrent());
    };

    Switch2Elm.prototype.hasCenterOff = function() {
      return (this.flags & Switch2Elm.FLAG_CENTER_OFF) !== 0;
    };

    return Switch2Elm;

  })(SwitchElm);

  return Switch2Elm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15,"./SwitchElm.coffee":26}],38:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, Rectangle, Settings, TextElm,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  TextElm = (function(_super) {
    __extends(TextElm, _super);

    TextElm.FLAG_CENTER = 1;

    TextElm.FLAG_BAR = 2;

    function TextElm() {
      var st;
      TextElm.__super__.constructor.call(this, xa, ya, xb, yb, f);
      this.text = "hello";
      this.lines = new Array();
      this.lines.add(text);
      this.size = 24;
      if (st) {
        if (typeof st === "string") {
          st = st.split(" ");
        }
        this.size = Math.floor(st.shift());
        this.text = st.shift();
        while (st.length !== 0) {
          this.text += " " + st.shift();
        }
      }
    }

    TextElm.prototype.split = function() {
      return this.lines = this.text.split("\n");
    };

    TextElm.prototype.dump = function() {
      return TextElm.__super__.dump.call(this) + " " + this.size + " " + this.text;
    };

    TextElm.prototype.getDumpType = function() {
      return "x";
    };

    TextElm.prototype.drag = function(xx, yy) {
      this.x1 = xx;
      this.y = yy;
      this.x2 = xx + 16;
      return this.y2 = yy;
    };

    TextElm.prototype.draw = function(renderContext) {
      var color, i, line, _i, _len, _ref;
      color = (this.needsHighlight() ? Settings.SELECT_COLOR : Settings.TEXT_COLOR);
      this.setBbox(this.x1, this.y, this.x1, this.y);
      i = 0;
      _ref = this.lines;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        renderContext.fillText(line, 40, 15 * i + 100);
        i++;
      }
      this.x2 = this.boundingBox.x1 + this.boundingBox.width;
      return this.y2 = this.boundingBox.y + this.boundingBox.height;
    };

    TextElm.prototype.getEditInfo = function(n) {
      var ei;
      if (n === 0) {
        ei = new EditInfo("Text", 0, -1, -1);
        ei.text = text;
        return ei;
      }
      if (n === 1) {
        return new EditInfo("Size", size, 5, 100);
      }
      if (n === 2) {
        ei = new EditInfo("", 0, -1, -1);
        ei.checkbox = new Checkbox("Center", (this.flags & TextElm.FLAG_CENTER) !== 0);
        return ei;
      }
      if (n === 3) {
        ei = new EditInfo("", 0, -1, -1);
        ei.checkbox = new Checkbox("Draw Bar On Top", (this.flags & TextElm.FLAG_BAR) !== 0);
        return ei;
      }
      return null;
    };

    TextElm.prototype.setEditValue = function(n, ei) {
      if (n === 0) {
        this.text = ei.textf.getText();
        this.split();
      }
      if (n === 1) {
        this.size = Math.floor(ei.value);
      }
      if (n === 3) {
        if (ei.checkbox.getState()) {
          this.flags |= TextElm.FLAG_BAR;
        } else {
          this.flags &= ~TextElm.FLAG_BAR;
        }
      }
      if (n === 2) {
        if (ei.checkbox.getState()) {
          return this.flags |= TextElm.FLAG_CENTER;
        } else {
          return this.flags &= ~TextElm.FLAG_CENTER;
        }
      }
    };

    TextElm.prototype.isCenteredText = function() {
      return (this.flags & TextElm.FLAG_CENTER) !== 0;
    };

    TextElm.prototype.getInfo = function(arr) {
      return arr[0] = this.text;
    };

    TextElm.prototype.getPostCount = function() {
      return 0;
    };

    return TextElm;

  })(CircuitComponent);

  return TextElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],39:[function(require,module,exports){
(function() {
  var CircuitComponent, DrawHelper, Point, Polygon, ProbeElm, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  ProbeElm = (function(_super) {
    __extends(ProbeElm, _super);

    ProbeElm.FLAG_SHOWVOLTAGE = 1;

    function ProbeElm(xa, ya, xb, yb, f, st) {
      ProbeElm.__super__.constructor.call(this, xa, ya, xb, yb, f);
    }

    ProbeElm.prototype.getDumpType = function() {
      return "p";
    };

    ProbeElm.prototype.toString = function() {
      return "ProbeElm";
    };

    ProbeElm.prototype.setPoints = function() {
      var x;
      ProbeElm.__super__.setPoints.call(this);
      if (this.point2.y < this.point1.y) {
        x = this.point1;
        this.point1 = this.point2;
        this.point2 = this.x1;
      }
      return this.center = DrawHelper.interpPoint(this.point1, this.point2, .5);
    };

    ProbeElm.prototype.draw = function(renderContext) {
      var color, hs, len, unit_text;
      hs = 8;
      this.setBboxPt(this.point1, this.point2, hs);
      len = this.dn - 32;
      this.calcLeads(Math.floor(len));
      if (this.isSelected()) {
        color = Settings.SELECT_COLOR;
      } else {
        color = DrawHelper.getVoltageColor(this.volts[0]);
      }
      renderContext.drawThickLinePt(this.point1, this.lead1, color);
      if (this.isSelected()) {
        color = Settings.SELECT_COLOR;
      } else {
        color = DrawHelper.getVoltageColor(this.volts[1]);
      }
      renderContext.drawThickLinePt(this.lead2, this.point2, color);
      if (this.mustShowVoltage()) {
        unit_text = DrawHelper.getShortUnitText(this.volts[0], "V");
        this.drawValues(unit_text, 4, renderContext);
      }
      return this.drawPosts(renderContext);
    };

    ProbeElm.prototype.mustShowVoltage = function() {
      return (this.flags & ProbeElm.FLAG_SHOWVOLTAGE) !== 0;
    };

    ProbeElm.prototype.getInfo = function(arr) {
      arr[0] = "scope probe";
      return arr[1] = "Vd = " + DrawHelper.getVoltageText(this.getVoltageDiff());
    };

    ProbeElm.prototype.stamp = function(stamper) {};

    ProbeElm.prototype.getConnection = function(n1, n2) {
      return false;
    };

    ProbeElm.prototype.getEditInfo = function(n) {
      var ei;
      if (n === 0) {
        ei = new EditInfo("", 0, -1, -1);
        ei.checkbox = new Checkbox("Show Voltage", this.mustShowVoltage());
        return ei;
      }
      return null;
    };

    ProbeElm.prototype.setEditValue = function(n, ei) {
      var flags;
      if (n === 0) {
        if (ei.checkbox.getState()) {
          return flags = ProbeElm.FLAG_SHOWVOLTAGE;
        } else {
          return flags &= ~ProbeElm.FLAG_SHOWVOLTAGE;
        }
      }
    };

    return ProbeElm;

  })(CircuitComponent);

  module.exports = ProbeElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}],50:[function(require,module,exports){
(function() {
  var Point, Polygon;

  Point = require('./point.coffee');

  Polygon = (function() {
    function Polygon(vertices) {
      var i;
      this.vertices = [];
      if (vertices && vertices.length % 2 === 0) {
        i = 0;
        while (i < vertices.length) {
          this.addVertex(vertices[i], vertices[i + 1]);
          i += 2;
        }
      }
    }

    Polygon.prototype.addVertex = function(x, y) {
      return this.vertices.push(new Point(x, y));
    };

    Polygon.prototype.getX = function(n) {
      return this.vertices[n].x;
    };

    Polygon.prototype.getY = function(n) {
      return this.vertices[n].y;
    };

    Polygon.prototype.numPoints = function() {
      return this.vertices.length;
    };

    return Polygon;

  })();

  module.exports = Polygon;

}).call(this);


},{"./point.coffee":47}],51:[function(require,module,exports){
(function() {
  var AntennaElm, CircuitComponent, DrawHelper, Point, Polygon, Rectangle, Settings,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Settings = require('../../settings/settings.coffee');

  DrawHelper = require('../../render/drawHelper.coffee');

  Polygon = require('../../geom/polygon.coffee');

  Rectangle = require('../../geom/rectangle.coffee');

  Point = require('../../geom/point.coffee');

  CircuitComponent = require('../circuitComponent.coffee');

  AntennaElm = (function(_super) {
    __extends(AntennaElm, _super);

    function AntennaElm(xa, ya, xb, yb, f, st) {
      AntennaElm.__super__.constructor.call(this, this, xa, ya, xb, yb, f);
    }

    return AntennaElm;

  })(CircuitComponent);

  module.exports = AntennaElm;

}).call(this);


},{"../../settings/settings.coffee":17,"../../render/drawHelper.coffee":46,"../../geom/polygon.coffee":50,"../../geom/rectangle.coffee":18,"../../geom/point.coffee":47,"../circuitComponent.coffee":15}]},{},[1])
;