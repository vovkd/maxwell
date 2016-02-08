CircuitComponent = require("../CircuitComponent.coffee")
DrawUtil = require('../../util/drawUtil.coffee')

class ChipElm extends CircuitComponent
  @ParameterDefinitions = {
    bits: {
      name: "Bits"
      data_type: parseInt
    }
    volts: {
      name: "Volts"
      data_type: parseFloat
    }
  }

  constructor: (xa, xb, ya, yb, params, f) ->
    super(xa, xb, ya, yb, params, f)




module.exports = ChipElm
