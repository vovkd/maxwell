CircuitComponent = require("../circuitComponent.coffee")
ChipElm = require("./ChipElm.coffee")
Util = require('../../util/util.coffee')

class LatchElm extends ChipElm

  constructor: (xa, xb, ya, yb, params, f) ->
    @lastLoad = false
    @loadPin = 0
    super(xa, xb, ya, yb, params, f)

  getName: ->
    "Latch"

  getDumpType: ->
    "168"

  needsBits: ->
    true

  getPostCount: ->
    @bits * 2 + 1

  getVoltageSourceCount: ->
    @bits

  setupPins: ->
    @sizeX = 2
    @sizeY = @bits + 1
    @pins = new Array(@getPostCount())

    for i in [0...@bits]
      @pins[i] = new ChipElm.Pin(@bits - 1 - i, ChipElm.SIDE_W, "I" + i)

    for i in [0...@bits]
      console.log(i + @bits)
      @pins[i + @bits] = new ChipElm.Pin(@bits - 1 - i, ChipElm.SIDE_E, "O")
      @pins[i + @bits].output = true

    @loadPin = @bits * 2
    @pins[@loadPin] = new ChipElm.Pin(@bits, ChipElm.SIDE_W, "Ld")

    @allocNodes()

  execute: ->
    if @pins[@loadPin].value and !@lastLoad
      for i in [0...@bits]
        @pins[i + @bits].value = @pins[i].value

    @lastLoad = @pins[@loadPin].value


module.exports = LatchElm
