CircuitComponent = require("../CircuitComponent.coffee")
ChipElm = require("./ChipElm.coffee")
DrawUtil = require('../../util/drawUtil.coffee')

class VcoElm extends ChipElm
  constructor: (xa, xb, ya, yb, params, f) ->
    super(xa, xb, ya, yb, params, f)


module.exports = VcoElm
