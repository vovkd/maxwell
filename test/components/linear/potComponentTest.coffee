PotElm = require("../../src/circuit/components/PotElm.coffee")

describe "Potentiometer", ->
  before ->
    @potElm = new PotElm(50, 50, 50, 150, { maxResistance: 1e6, position: 50, sliderText: "silly" })

  it "has correct position", ->
    expect(@potElm.x1).to.equal(50)
    expect(@potElm.y1).to.equal(50)
    expect(@potElm.x2).to.equal(50)
    expect(@potElm.y2).to.equal(146)

  it "has correct parameters", ->
    expect(@potElm.maxResistance).to.equal(1e6)
    expect(@potElm.position).to.equal(50)
    expect(@potElm.sliderText).to.equal("silly")
    expect(@potElm.getSliderValue()).to.equal(5000)

  describe "Rendering", ->
    before (done) ->
      @Circuit = new Circuit("BasicPotentiometer")

      Canvas = require('canvas')
      @canvas = new Canvas(200, 200)
      ctx = @canvas.getContext('2d')

      @Circuit.clearAndReset()
      @Circuit.solder(@potElm)

      @renderer = new Renderer(@Circuit, @canvas)
      @renderer.context = ctx
      done()

    it "renders initial circuit", ->
      @renderer.draw()

      fs.writeFileSync("test/fixtures/componentRenders/#{@Circuit.name}_init.png", @canvas.toBuffer())