describe "Transistor Component", ->
  describe "default initialization", ->
    before ->
      @transistorElm = new TransistorElm()

    it "doesn't set any positions", ->
      expect(@transistorElm.x2()).to.equal(undefined)
      expect(@transistorElm.y2()).to.equal(undefined)
      expect(@transistorElm.x1()).to.equal(undefined)
      expect(@transistorElm.y1()).to.equal(undefined)

    it "sets default parameters", ->
      expect(@transistorElm.pnp).to.equal(-1)
      expect(@transistorElm.lastvbe).to.equal(0)
      expect(@transistorElm.lastvbc).to.equal(0)
      expect(@transistorElm.beta).to.equal(100)

    it "has correct initial rendering conditions", ->
      expect(@transistorElm.curcount).to.equal(undefined)
      expect(@transistorElm.point1).to.eql({ x: undefined, y: undefined })
      expect(@transistorElm.point2).to.eql({ x: undefined, y: undefined })
      expect(@transistorElm.lead1).to.equal(undefined)
      expect(@transistorElm.lead2).to.equal(undefined)

    it "has correct node relationships", ->
      expect(@transistorElm.nodes).to.eql([0, 0, 0])
      expect(@transistorElm.volts).to.eql([0, -0, -0])

    it "has default method return values", ->
      @transistorElm.numPosts().should.equal 3
      @transistorElm.isWire().should.equal false
      @transistorElm.hasGroundConnection().should.equal false
      @transistorElm.needsShortcut().should.equal false
      @transistorElm.canViewInScope().should.equal true
      @transistorElm.numInternalNodes().should.equal 0
      @transistorElm.orphaned().should.equal true

    it "has correct initial state", ->
      expect(@transistorElm.noDiagonal).to.eql(true)
      expect(@transistorElm.component_id).to.be
      expect(@transistorElm.voltSource).to.equal(0)
      expect(@transistorElm.current).to.equal(0)
      expect(@transistorElm.ie).to.equal(0)
      expect(@transistorElm.ic).to.equal(0)
      expect(@transistorElm.ib).to.equal(0)
      expect(@transistorElm.getCurrent()).to.equal(0)
      expect(@transistorElm.getVoltageDiff()).to.equal(0)

    it "has params", ->
      expect(@transistorElm.params).to.eql({
        "beta": 100
        "pnp": -1
        "lastvbc": 0
        "lastvbe": 0
      })

  describe "With params object", ->
    before ->
      @transistorElm = new TransistorElm(50, 75, 50, 150, {"pnp": -1, "lastvbe": "-4.295", "lastvbc": "0.705", "beta": "200.0"})
      @Circuit = new Circuit("Basic BJT")

      @transistorElm.setPoints()
      @transistorElm.setup()
      @Circuit.solder(@transistorElm)

    it "has params", ->
      expect(@transistorElm.params).to.eql({
        "beta": 200
        "pnp": -1
        "lastvbe": -4.295
        "lastvbc": 0.705
      })

    it "has params", ->
      expect(@transistorElm.beta).to.eql(200)
      expect(@transistorElm.pnp).to.eql(-1)
      expect(@transistorElm.volts).to.eql([0, 4.295, -0.705])
      expect(@transistorElm.params).to.eql({
        "beta": 200
        "pnp": -1
        "lastvbc": 0.705
        "lastvbe": -4.295
      })

    it "has correct position", ->
      expect(@transistorElm.x1()).to.equal(50)
      expect(@transistorElm.y1()).to.equal(75)
      expect(@transistorElm.x2()).to.equal(50)
      expect(@transistorElm.y2()).to.equal(150)

      expect(@transistorElm.dx()).to.equal(0)
      expect(@transistorElm.dy()).to.equal(75)
      expect(@transistorElm.dn()).to.equal(75)
      expect(@transistorElm.dsign()).to.equal(1)
      expect(@transistorElm.dpx1()).to.equal(1)
      expect(@transistorElm.dpy1()).to.equal(0)
      expect(@transistorElm.isVertical()).to.equal(true)
      expect(@transistorElm.getCenter()).to.eql({x: 50, y: 112.5})

      expect(@transistorElm.getBoundingBox()).to.eql({x: 49, y: 75, width: 5, height: 75})

    it "snaps to grid when moved", ->
      @transistorElm.moveTo(100, 162.5)
      expect(@transistorElm.getCenter()).to.eql({x: 98, y: 160.5})

      expect(@transistorElm.x1()).to.equal(98)
      expect(@transistorElm.y1()).to.equal(123)
      expect(@transistorElm.x2()).to.equal(98)
      expect(@transistorElm.y2()).to.equal(198)

    it "can be stringified", ->
      expect(@transistorElm.toString()).to.eql("""TransistorElm@[98 123 98 198]: {"pnp":-1,"lastvbe":-4.295,"lastvbc":0.705,"beta":200}""")
      expect(@transistorElm.getName()).to.eql("Bipolar Junction Transistor")

    it "can stamp", ->
      @transistorElm.stamp(@Circuit.Solver.Stamper)

    describe "Rendering", ->
      before ->
        @Circuit.clearAndReset()
        @Circuit.solder(@transistorElm)

        @canvas = new Canvas(200, 300)

        @renderer = new CircuitApplication(@Circuit, @canvas)
        @renderer.context = @canvas.getContext('2d')
        @renderer.drawComponents()

        @componentImageFileName = "test/fixtures/componentRenders/#{@Circuit.name}_init.png"

      it "renders initial circuit", ->
        fs.writeFileSync(@componentImageFileName, @canvas.toBuffer())

      it "compares buffer", (done) ->

        resemble(@canvas.toBuffer()).compareTo(@componentImageFileName).ignoreAntialiasing().onComplete (data) =>
          data.getDiffImage().pack().pipe(fs.createWriteStream(@componentImageFileName + "_diff.png"));

          expect(data.misMatchPercentage).to.be.at.most(0.01)

          done()



