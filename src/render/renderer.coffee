# #######################################################################
# CircuitCanvas:
#     Top-level class specification for a circuit
#
# @author Anthony Erlinger
# @year 2012
#
# Observes: Circuit, MouseHandler
# Observed By: CircuitComponent, Circuit, MouseHandler
#
# #######################################################################

BaseRenderer = require('./BaseRenderer.coffee')
Circuit = require('../circuit/circuit.coffee')
CircuitComponent = require('../circuit/circuitComponent.coffee')
Settings = require('../settings/settings.coffee')
Rectangle = require('../geom/rectangle.coffee')
Polygon = require('../geom/Polygon.coffee')
Point = require('../geom/point.coffee')
Util = require('../util/util.coffee')
environment = require('../environment.coffee')


# X components
# Y nodes
# Z Active Components
# Timestep:
# Frametime:
# Active power consumption:
# Nonlinear circuit (2nd order)
# DE Solver: Symplectic Euler
# Matrix Solver: LU Factorization/Crout
# Converged in X subiterations using Newton's method
# Residual: 0
# Norm(Q):
# Stability margin:

# Traversal depth:


class SelectionMarquee extends Rectangle
  constructor: (@x1, @y1) ->

  reposition: (x, y) ->
    _x1 = Math.min(x, @x1)
    _x2 = Math.max(x, @x1)
    _y1 = Math.min(y, @y1)
    _y2 = Math.max(y, @y1)

    @x2 = _x2
    @y2 = _y2

    @x = @x1 = _x1
    @y = @y1 = _y1

    @width = _x2 - _x1
    @height = _y2 - _y1

  draw: (renderContext) ->
    renderContext.lineWidth = 0.1
    if @x1? && @x2? && @y1? && @y2?
      renderContext.drawLine @x1, @y1, @x2, @y1
      renderContext.drawLine @x1, @y2, @x2, @y2

      renderContext.drawLine @x1, @y1, @x1, @y2
      renderContext.drawLine @x2, @y1, @x2, @y2


class Renderer extends BaseRenderer
  @ON_COMPONENT_HOVER = "ON_COMPONENT_HOVER"
  @ON_COMPONENT_CLICKED = "ON_COMPONENT_CLICKED"
  @ON_COMPONENTS_SELECTED = "ON_COMPONENTS_SELECTED"
  @ON_COMPONENTS_DESELECTED = "ON_COMPONENTS_DESELECTED"
  @ON_COMPONENTS_MOVED = "ON_COMPONENTS_MOVED"

  @STATE_EDIT
  @STATE_PLACE
  @STATE_RUN

  MOUSEDOWN = 1

  constructor: (@Circuit, @Canvas) ->
    super()

    @highlightedComponent = null
    @addComponent = null
    @selectedNode = null
    @selectedComponents = []

    # TODO: Width and height are currently undefined
    @width = @Canvas.width
    @height = @Canvas.height

    @state = @STATE_RUN

    @config = {
      keyboard: true
    }

    if environment.isBrowser
      @context = Sketch.augment @Canvas.getContext("2d"), {
        draw: @draw
        mousemove: @mousemove
        mousedown: @mousedown
        mouseup: @mouseup
        fullscreen: false
        width: @width
        height: @height
      }

      @context.lineJoin = 'miter'

    # Callbacks
    @onComponentClick = null
    @onComponentHover = null
    @onNodeHover = null
    @onNodeClick = null

    # @Circuit.addObserver Circuit.ON_START_UPDATE, @clear
    # @Circuit.addObserver Circuit.ON_RESET, @clear
    # @Circuit.addObserver Circuit.ON_END_UPDATE, @clear

  getSelectedComponents: ->
    @selectedComponents

  getPlaceComponent: ->
    @placeComponent

  pause: ->
  play: ->
  restart: ->

  clearPlaceComponent: ->
    @placeComponent = null


  mousemove: (event) =>
    x = event.offsetX
    y = event.offsetY

    @newlyHighlightedComponent = null
    @selectedNode = null

    @lastX = @snapX
    @lastY = @snapY

    @snapX = Util.snapGrid(x)
    @snapY = Util.snapGrid(y)

    # TODO: WIP for interactive element placing
    if @placeComponent
      if @placeComponent.x1 && @placeComponent.y1
        @placeComponent.x2 = @snapX
        @placeComponent.y2 = @snapY
        @placeComponent.setPoints()

    if @marquee?
      @marquee?.reposition(x, y)
      @selectedComponents = []

      for component in @Circuit.getElements()
        if @marquee?.collidesWithComponent(component)
          @selectedComponents.push(component)
    else
      @selectedNode = @Circuit.getNodeAtCoordinates(@snapX, @snapY)

      if @selectedNode
        @onNodeHover(@selectedNode)

      for component in @Circuit.getElements()
        if component.getBoundingBox().contains(x, y)
          @newlyHighlightedComponent = component

      if @newlyHighlightedComponent
        if @newlyHighlightedComponent != @highlightedComponent
          @highlightedComponent = @newlyHighlightedComponent
          @onComponentHover?(@highlightedComponent)
          @notifyObservers(Renderer.ON_COMPONENT_HOVER, @highlightedComponent)

      else
        if @highlightedComponent != null
          @onComponentUnhover?(@highlightedComponent)

        @highlightedComponent = null

    if @marquee is null and @selectedComponents?.length > 0 and event.which == MOUSEDOWN and (@lastX != @snapX or @lastY != @snapY)
      for component in @selectedComponents
        component.move(@snapX - @lastX, @snapY - @lastY)

  mousedown: (event) =>
    x = event.offsetX
    y = event.offsetY

    if @selectedNode
      @onNodeClick(@selectedNode)

    if @placeComponent
      if @placeComponent.x1 && @placeComponent.y1
        @placeComponent.x2 = Util.snapGrid(x)
        @placeComponent.y2 = Util.snapGrid(y)
        @Circuit.solder(@placeComponent)

        placeComponentKlass = @placeComponent.constructor
        @placeComponent = new placeComponentKlass()
      else
        @placeComponent.x1 = Util.snapGrid(x)
        @placeComponent.y1 = Util.snapGrid(y)

    if @highlightedComponent == null
      @selectedComponents = []
      @marquee = new SelectionMarquee(x, y)

    for component in @Circuit.getElements()
      if component.getBoundingBox().contains(x, y)
        @notifyObservers(Renderer.ON_COMPONENT_CLICKED, component)

        @selectedComponents = [component]

        component.toggle?()

        component.onclick()
        @onComponentClick?(component)

  mouseup: (event) =>
    @marquee = null

    if @selectedComponents?.length > 0
      @notifyObservers(Renderer.ON_COMPONENTS_DESELECTED, @selectedComponents)


  draw: =>
    if @snapX? && @snapY?
      @drawCircle(@snapX, @snapY, 3, "#F00")

    @drawInfoText()
    @marquee?.draw(this)

    # UPDATE FRAME
    @Circuit.updateCircuit()

    @drawComponents()

    if @context
      if @placeComponent
        @context.fillText("Placing #{@placeComponent.constructor.name}", @snapX, @snapY)

        if @placeComponent.x1 && @placeComponent.x2
          @drawComponent(@placeComponent)

      if @selectedNode
        @drawCircle(@selectedNode.x, @selectedNode.y, Settings.POST_RADIUS + 2, 2, Settings.HIGHLIGHT_COLOR)

  drawComponents: ->
    if @context
      for component in @Circuit.getElements()
        if @marquee?.collidesWithComponent(component)
          console.log("MARQUEE COLLIDE: " + component)
        @drawComponent(component)

  drawComponent: (component) ->
    if component in @selectedComponents
      @context.strokeStyle = "#FF0"

    # Main entry point to draw component
    component.draw(this)


  drawInfoText: ->
    if @highlightedComponent?
      arr = []
      @highlightedComponent.getInfo(arr)

      for idx in [0...arr.length]
        @context.fillText(arr[idx], 500, idx * 10 + 15)

  drawValue: (perpindicularOffset, parallelOffset, component, text = null, rotation = 0) ->
    @context.save()
    @context.textAlign = "center";

    stringWidth = @context.measureText(text).width
    stringHeight = @context.measureText(text).actualBoundingBoxAscent || 0

    @context.fillStyle = Settings.TEXT_COLOR
    if component.isVertical()

      x = component.getCenter().x #+ perpindicularOffset
      y = component.getCenter().y #+ parallelOffset - stringHeight / 2.0

      @context.translate(x, y)
      @context.rotate(Math.PI/2)
      @fillText text, parallelOffset, -perpindicularOffset
    else
      x = component.getCenter().x + parallelOffset
      y = component.getCenter().y + perpindicularOffset

      @fillText text, x, y

    @context.restore()


  # TODO: Move to CircuitComponent
  drawDots: (ptA, ptB, component) =>
    return if @Circuit?.isStopped()

    ds = Settings.CURRENT_SEGMENT_LENGTH

    dx = ptB.x - ptA.x
    dy = ptB.y - ptA.y
    dn = Math.sqrt dx * dx + dy * dy

    newPos = component.curcount

    while newPos < dn

      xOffset = ptA.x + newPos * dx / dn
      yOffset = ptA.y + newPos * dy / dn

      if Settings.CURRENT_DISPLAY_TYPE == Settings.CURENT_TYPE_DOTS
        @fillCircle(xOffset, yOffset, Settings.CURRENT_RADIUS, 1, Settings.CURRENT_COLOR)
      else
        xOffset0 = xOffset - 3 * dx / dn
        yOffset0 = yOffset - 3 * dy / dn

        xOffset1 = xOffset + 3 * dx / dn
        yOffset1 = yOffset + 3 * dy / dn

        @drawLine(xOffset0, yOffset0, xOffset1, yOffset1, Settings.CURRENT_COLOR, 1)

      newPos += ds

  # TODO: Move to CircuitComponent
  drawLeads: (component) ->
    if component.point1? and component.lead1?
      @drawLinePt component.point1, component.lead1, Util.getVoltageColor(component.volts[0])
    if component.point2? and component.lead2?
      @drawLinePt component.lead2, component.point2, Util.getVoltageColor(component.volts[1])

  # TODO: Move to CircuitComponent
  drawPosts: (component) ->
    for i in [0...component.getPostCount()]
      post = component.getPost(i)
      @drawPost post.x, post.y

  drawPost: (x0, y0, fillColor = Settings.POST_COLOR, strokeColor = Settings.POST_COLOR) ->
    @fillCircle x0, y0, Settings.POST_RADIUS, 1, fillColor, strokeColor


module.exports = Renderer
