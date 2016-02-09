CircuitComponent = require("../CircuitComponent.coffee")
DrawUtil = require('../../util/drawUtil.coffee')

class TransLineElm extends CircuitComponent
  @ParameterDefinitions = {
    delay: {
      name: "Delay"
      data_type: parseFloat
    }
    imped: {
      name: "Impedance"
      data_type: parseFloat
    }
    width: {
      name: "Width (m)"
      data_type: parseFloat
    }
  }

  constructor: (xa, xb, ya, yb, params, f) ->
    super(xa, xb, ya, yb, params, f)

    @noDiagonal = true
    @reset()

module.exports = TransLineElm