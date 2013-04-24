// Generated by CoffeeScript 1.4.0
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(['cs!KeyboardState', 'cs!Oscilloscope', 'cs!Logger', 'cs!ColorMapState', 'cs!CircuitState', 'cs!CircuitCanvas', 'cs!Point', 'cs!Rectangle', 'cs!Polygon', 'cs!Grid', 'cs!CircuitEngineParams', 'cs!MouseState', 'cs!Settings', 'cs!ComponentRegistry', 'cs!Hint', 'cs!CommandHistory', 'cs!CircuitSolver', 'cs!Units', 'cs!Module', 'cs!Observer'], function(KeyboardState, Oscilloscope, Logger, ColorMapState, CircuitState, CircuitCanvas, Point, Rectangle, Polygon, Grid, CircuitEngineParams, MouseState, Settings, ComponentRegistry, Hint, CommandHistory, CircuitSolver, Units, Module, Observer) {
    var Circuit;
    Circuit = (function(_super) {

      __extends(Circuit, _super);

      Circuit.ON_START_UPDATE = "ON_START_UPDATE";

      Circuit.ON_COMPLETE_UPDATE = "ON_END_UPDATE";

      Circuit.ON_START = "ON_START";

      Circuit.ON_PAUSE = "ON_PAUSE";

      Circuit.ON_RESET = "ON_RESET";

      Circuit.ON_SOLDER = "ON_SOLDER";

      Circuit.ON_DESOLDER = "ON_DESOLDER";

      Circuit.ON_ADD_COMPONENT = "ON_ADD_COMPONENT";

      Circuit.ON_REMOVE_COMPONENT = "ON_MOVE_COMPONENT";

      Circuit.ON_MOVE_COMPONENT = "ON_MOVE_COMPONENT";

      Circuit.ON_ERROR = "ON_ERROR";

      Circuit.ON_WARNING = "ON_WARNING";

      function Circuit() {
        this.Params = new CircuitEngineParams();
        this.CommandHistory = new CommandHistory();
        this.clearAndReset();
        this.bindListeners();
      }

      Circuit.prototype.setParamsFromJSON = function(jsonData) {
        return this.Params = new CircuitEngineParams(jsonData);
      };

      Circuit.prototype.clearAndReset = function() {
        var element, _i, _len, _ref;
        _ref = this.elementList != null;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          element = _ref[_i];
          element.destroy();
        }
        this.Solver = new CircuitSolver(this);
        this.Grid = new Grid();
        this.nodeList = [];
        this.elementList = [];
        this.voltageSources = [];
        this.scopes = [];
        this.scopeColCount = [];
        this.time = 0;
        this.lastTime = 0;
        this.mouseState = new MouseState();
        this.keyboardState = new KeyboardState();
        this.colorMapState = new ColorMapState();
        this.state = CircuitState.RUNNING;
        this.clearErrors();
        return this.notifyObservers(this.ON_RESET);
      };

      Circuit.prototype.bindListeners = function() {};

      Circuit.prototype.solder = function(newElement) {
        this.notifyObservers(this.ON_SOLDER);
        newElement.Circuit = this;
        newElement.setPoints();
        console.log("Soldering Element: " + newElement);
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

      Circuit.prototype.getVoltageSources = function() {
        return this.voltageSources;
      };

      Circuit.prototype.getScopes = function() {
        return [];
      };

      Circuit.prototype.setupScopes = function() {};

      /* Circuit Element Accessors:
      */


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

      /* Circuit Nodes:
      */


      Circuit.prototype.resetNodes = function() {
        return this.nodeList = [];
      };

      Circuit.prototype.addCircuitNode = function(circuitNode) {
        var _ref;
        return (_ref = this.nodeList) != null ? _ref.push(circuitNode) : void 0;
      };

      Circuit.prototype.getNode = function(idx) {
        return this.nodeList[idx];
      };

      Circuit.prototype.getNodes = function() {
        return this.nodeList;
      };

      Circuit.prototype.numNodes = function() {
        var _ref;
        return (_ref = this.nodeList) != null ? _ref.length : void 0;
      };

      Circuit.prototype.getGrid = function() {
        return this.Grid;
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

      /* Simulation Frame Computation
      */


      Circuit.prototype.run = function() {
        this.notifyObservers(this.ON_START);
        return this.Solver.run();
      };

      Circuit.prototype.pause = function() {
        this.notifyObservers(this.ON_PAUSE);
        return this.Solver.pause("Circuit is paused");
      };

      Circuit.prototype.restartAndStop = function() {
        this.restartAndRun();
        this.simulation = cancelAnimationFrame();
        return this.Solver.pause("Restarted Circuit from time 0");
      };

      Circuit.prototype.restartAndRun = function() {
        if (!this.Solver) {
          return halt("Solver not initialized!");
        }
      };

      Circuit.prototype.reset = function() {
        var element, scope, _i, _j, _len, _len1, _ref, _ref1;
        _ref = this.elementList;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          element = _ref[_i];
          element.reset();
        }
        _ref1 = this.scopes;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          scope = _ref1[_j];
          scope.resetGraph();
        }
        return this.Solver.reset();
      };

      /* Simulation Frame Computation
      */


      /*
          UpdateCircuit:
      
           Updates the circuit each frame.
      
            1. ) Reconstruct Circuit:
                  Rebuilds a data representation of the circuit (only applied when circuit changes)
            2. ) Solve Circuit build matrix representation of the circuit solve for the voltage and current for each component.
                  Solving is performed via LU factorization.
      */


      Circuit.prototype.updateCircuit = function() {
        var endTime, frameTime, startTime;
        this.notifyObservers(this.ON_START_UPDATE);
        startTime = (new Date()).getTime();
        this.Solver.reconstruct();
        if (!this.Solver.isStopped) {
          this.Solver.solveCircuit();
          this.lastTime = this.updateTimings();
        } else {
          this.lastTime = 0;
        }
        this.notifyObservers(this.ON_COMPLETE_UPDATE);
        endTime = (new Date()).getTime();
        frameTime = endTime - startTime;
        return this.lastFrameTime = this.lastTime;
      };

      Circuit.prototype.getCircuitBottom = function() {
        var bottom, element, rect, _i, _len, _ref;
        if (this.circuitBottom) {
          return this.circuitBottom;
        }
        _ref = this.elementList;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          element = _ref[_i];
          rect = element.boundingBox;
          bottom = rect.height + rect.y;
          if (bottom > this.circuitBottom) {
            this.circuitBottom = bottom;
          }
        }
        return this.circuitBottom;
      };

      Circuit.prototype.recalculateCircuitBounds = function() {
        var bounds, element, maxX, maxY, minX, minY, _i, _len, _ref, _results;
        maxX = Number.MIN_VALUE;
        maxY = Number.MIN_VALUE;
        minX = Number.MAX_VALUE;
        minY = Number.MAX_VALUE;
        _ref = this.elementList;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          element = _ref[_i];
          bounds = element.boundingBox;
          if (bounds.x < minX) {
            minX = bounds.x;
          }
          if (bounds.y < minY) {
            minY = bounds.y;
          }
          if ((bounds.width + bounds.x) > maxX) {
            maxX = bounds.height + bounds.x;
          }
          if ((bounds.height + bounds.y) > maxY) {
            maxY = bounds.height + bounds.y;
          }
          _results.push(this.circuitBounds = new Rectangle(minX, minY, maxX - minX, maxY - minY));
        }
        return _results;
      };

      Circuit.prototype.updateTimings = function() {
        var currentSpeed, inc, sysTime;
        sysTime = (new Date()).getTime();
        inc = Math.floor(sysTime - this.lastTime);
        currentSpeed = Math.exp(this.Params.currentSpeed / 3.5 - 14.2);
        this.Params.currentMult = 1.7 * inc * currentSpeed;
        if ((sysTime - this.secTime) >= 1000) {
          this.framerate = this.frames;
          this.steprate = this.Solver.steps;
          this.frames = 0;
          this.steps = 0;
          this.secTime = sysTime;
        }
        this.frames++;
        return sysTime;
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

      /* Simulation Accessor Methods
      */


      Circuit.prototype.isStopped = function() {
        return this.Solver.isStopped;
      };

      Circuit.prototype.voltageRange = function() {
        return this.Params['voltageRange'];
      };

      Circuit.prototype.powerRange = function() {
        return this.Params['powerRange'];
      };

      Circuit.prototype.currentSpeed = function() {
        return 62;
      };

      Circuit.prototype.getState = function() {
        return this.state;
      };

      return Circuit;

    })(Observer);
    return Circuit;
  });

}).call(this);
