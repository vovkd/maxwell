let CircuitComponent = require("./CircuitComponent.js");
let Util = require('../util/Util');

class ThermistorElm extends CircuitComponent {
  static get Fields() {
    return {
      maxresistance: {
        name: "Max. Resistance",
        data_type: parseFloat
      },
      minresistance: {
        name: "Min. Resistance",
        data_type: parseFloat
      }
    };
  }


  constructor(xa, xb, ya, yb, params, f) {
    super(xa, xb, ya, yb, params, f);
  }
}

module.exports = ThermistorElm;
