// Generated by CoffeeScript 1.4.0
(function() {

  define(['jquery', 'cs!ComponentRegistry', 'cs!Circuit'], function($, ComponentRegistry, Circuit) {
    var CircuitLoader;
    CircuitLoader = (function() {

      function CircuitLoader() {}

      CircuitLoader.parseJSON = function(circuit, jsonData) {
        var circuitParams, elementData, flags, newCircuitElm, params, sym, type, x1, x2, y1, y2, _i, _len, _results;
        circuitParams = jsonData.shift();
        circuit.setParamsFromJSON(circuitParams);
        _results = [];
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
          if (type === 'Hint') {
            console.log("Hint found in file!");
          }
          if (type === 'Oscilloscope') {
            console.log("Scope found in file!");
          }
          try {
            if (!type) {
              circuit.warn("Unrecognized Type");
            }
            if (!sym) {
              _results.push(circuit.warn("Unrecognized dump type: " + type));
            } else {
              newCircuitElm = new sym(x1, y1, x2, y2, flags, params);
              _results.push(circuit.solder(newCircuitElm));
            }
          } catch (e) {
            _results.push(circuit.halt(e.message));
          }
        }
        return _results;
      };

      /*
          Retrieves string data from a circuit text file (via AJAX GET)
      */


      CircuitLoader.createCircuitFromJSON = function(circuitFileName, context, onComplete) {
        var _this = this;
        if (context == null) {
          context = null;
        }
        if (onComplete == null) {
          onComplete = null;
        }
        return $.getJSON(circuitFileName, function(jsonData) {
          var circuit;
          circuit = new Circuit(context);
          CircuitLoader.parseJSON(circuit, jsonData);
          return typeof onComplete === "function" ? onComplete(circuit) : void 0;
        });
      };

      return CircuitLoader;

    })();
    return CircuitLoader;
  });

}).call(this);
