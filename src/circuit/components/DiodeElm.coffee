Settings = require('../../settings/settings.coffee')
Polygon = require('../../geom/polygon.coffee')
Rectangle = require('../../geom/rectangle.coffee')
Point = require('../../geom/point.coffee')
CircuitComponent = require('../circuitComponent.coffee')
ArrayUtils = require('../../util/arrayUtils.coffee')

class DiodeElm extends CircuitComponent

  @FLAG_FWDROP: 1
  @DEFAULT_DROP: .805904783

  @ParameterDefinitions = {
    fwdrop: {
      name: "Voltage"
      unit: "Voltage"
      symbol: "V"
      default_value: DiodeElm.DEFAULT_DROP
      data_type: "float"
      range: [-Infinity, Infinity]
      type: "physical"
    }

#    flags: DiodeElm.FLAG_FWDROP
  }

  constructor: (xa, ya, xb, yb, params) ->
    @hs = 8
    @poly
    @cathode = []

    #    @diode = new Diode(self)
    @fwdrop = DiodeElm.DEFAULT_DROP
    @zvoltage = 0

    super(xa, ya, xb, yb, params)

    #    if (f & DiodeElm.FLAG_FWDROP) > 0
    #      try
    #        @fwdrop = parseFloat(st)

    @nodes = new Array(2)
    @vt = 0
    @vdcoef = 0
    @fwdrop = 0
    @zvoltage = 0
    @zoffset = 0
    @lastvoltdiff = 0
    @crit = 0
    @leakage = 1e-14

    @setup()

  nonLinear: ->
    true

  setup: ->
    @vdcoef = Math.log(1 / @leakage + 1) / @fwdrop
    @vt = 1 / @vdcoef

    # critical voltage for limiting; current is vt/sqrt(2) at this voltage
    @vcrit = @vt * Math.log(@vt / (Math.sqrt(2) * @leakage))

    unless @zvoltage is 0
    # calculate offset which will give us 5mA at zvoltage
      i = -.005
      @zoffset = @zvoltage - Math.log(-(1 + i / @leakage)) / @vdcoef

    #    @diode.setup @fwdrop, @zvoltage

  getDumpType: ->
    "d"

  draw: (renderContext) ->
    @calcLeads renderContext, 16

    @cathode = ArrayUtils.newPointArray(2)
    [pa, pb] = renderContext.interpolateSymmetrical @lead1, @lead2, 0, @hs
    [@cathode[0], @cathode[1]] = renderContext.interpolateSymmetrical @lead1, @lead2, 1, @hs
    @poly = renderContext.renderContext([pa, pb, @lead2])

    @drawDiode(renderContext)
    @drawDots(@point1, @point2, renderContext)
    @drawPosts(renderContext)

  reset: ->
    #    @diode.reset()
    @lastvoltdiff = 0
    @volts[0] = @volts[1] = @curcount = 0

  drawDiode: (renderContext) ->
    @setBboxPt @point1, @point2, @hs
    v1 = @volts[0]
    v2 = @volts[1]
    @draw2Leads(renderContext)

    # TODO: RENDER DIODE

    # draw arrow
    #this.setPowerColor(true);
    color = renderContext.getVoltageColor(v1)
    renderContext.drawThickPolygonP @poly, color

    #g.fillPolygon(poly);

    # draw the diode plate
    color = renderContext.getVoltageColor(v2)
    renderContext.drawLinePt @cathode[0], @cathode[1], color

  stamp: (stamper) ->
    #    @nodes[0] = n0
    #    @nodes[1] = n1
    stamper.stampNonLinear @nodes[0]
    stamper.stampNonLinear @nodes[1]
    #    @diode.stamp @nodes[0], @nodes[1], stamper

  doStep: (stamper) ->
    voltdiff = @volts[0] - @volts[1]

    # used to have .1 here, but needed .01 for peak detector
    if Math.abs(voltdiff - @lastvoltdiff) > .01
      @Circuit.converged = false

    voltdiff = @limitStep(voltdiff, @lastvoltdiff)

    @lastvoltdiff = voltdiff

    if voltdiff >= 0 or @zvoltage is 0
      # regular diode or forward-biased zener
      eval_ = Math.exp(voltdiff * @vdcoef)

      # make diode linear with negative voltages; aids convergence
      eval_ = 1  if voltdiff < 0
      geq = @vdcoef * @leakage * eval_
      nc = (eval_ - 1) * @leakage - geq * voltdiff

      stamper.stampConductance @nodes[0], @nodes[1], geq
      stamper.stampCurrentSource @nodes[0], @nodes[1], nc
    else
      # Zener diode
      #* I(Vd) = Is * (exp[Vd*C] - exp[(-Vd-Vz)*C] - 1 )
      #*
      #* geq is I'(Vd)
      #* nc is I(Vd) + I'(Vd)*(-Vd)
      geq = @leakage * @vdcoef * (Math.exp(voltdiff * @vdcoef) + Math.exp((-voltdiff - @zoffset) * @vdcoef))
      nc = @leakage * (Math.exp(voltdiff * @vdcoef) - Math.exp((-voltdiff - @zoffset) * @vdcoef) - 1) + geq * (-voltdiff)

      stamper.stampConductance @nodes[0], @nodes[1], geq
      stamper.stampCurrentSource @nodes[0], @nodes[1], nc

  calculateCurrent: ->
    if voltdiff >= 0 or @zvoltage is 0
      return @leakage * (Math.exp(voltdiff * @vdcoef) - 1)

    return @leakage * (Math.exp(voltdiff * @vdcoef) - Math.exp((-voltdiff - @zoffset) * @vdcoef) - 1)

  getInfo: (arr) ->
    super()
    arr[0] = "diode"
    arr[1] = "I = " + @getUnitText(@getCurrent(), "A")
    arr[2] = "Vd = " + @getUnitText(@getVoltageDiff(), "V")
    arr[3] = "P = " + @getUnitText(@getPower(), "W")
    arr[4] = "Vf = " + @getUnitText(@fwdrop, "V")

  toString: ->
    "DiodeElm"

  # TODO: fix
  needsShortcut: ->
    return true

  limitStep: (vnew, vold) ->
    arg = undefined
    oo = vnew

    # check new voltage; has current changed by factor of e^2?
    if vnew > @vcrit and Math.abs(vnew - vold) > (@vt + @vt)
      if vold > 0
        arg = 1 + (vnew - vold) / @vt
        if arg > 0
          # adjust vnew so that the current is the same
          # as in linearized model from previous iteration.
          # current at vnew = old current * arg
          vnew = vold + @vt * Math.log(arg)

          # current at v0 = 1uA
          v0 = Math.log(1e-6 / @leakage) * @vt
          vnew = Math.max(v0, vnew)
        else
          vnew = @vcrit
      else
        # adjust vnew so that the current is the same
        # as in linearized model from previous iteration.
        # (1/vt = slope of load line)
        vnew = @vt * Math.log(vnew / @vt)
      @Circuit.converged = false

    else if vnew < 0 and @zoffset isnt 0
      # for Zener breakdown, use the same logic but translate the values
      vnew = -vnew - @zoffset
      vold = -vold - @zoffset
      if vnew > @vcrit and Math.abs(vnew - vold) > (@vt + @vt)
        if vold > 0
          arg = 1 + (vnew - vold) / @vt
          if arg > 0
            vnew = vold + @vt * Math.log(arg)
            v0 = Math.log(1e-6 / @leakage) * @vt
            vnew = Math.max(v0, vnew)

          else
            vnew = @vcrit
        else
          vnew = @vt * Math.log(vnew / @vt)

        @Circuit.converged = false
      vnew = -(vnew + @zoffset)
    vnew


module.exports = DiodeElm
