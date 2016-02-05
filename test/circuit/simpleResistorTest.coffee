#  r 256 176 256 304 0 100.0
#  172 256 176 256 128 0 6 5.0 5.0 0.0 0.0 0.5 Voltage
#  g 256 304 256 352 0
Circuit = require('../../src/circuit/circuit.coffee')
CircuitLoader = require('../../src/io/CircuitLoader.coffee')

describe "Simple single resistor circuit", ->
  beforeEach (done) ->
    @json = [
      {
        "completion_status": "under_development",
        "created_at": null,
        "current_speed": 50.0,
        "description": null,
        "flags": 1,
        "id": null,
        "name_unique": "ohms.txt",
        "power_range": 50.0,
        "sim_speed": 10.391409633455755,
        "time_step": 5.0e-06,
        "title": "Ohm's Law",
        "topic": "Basics",
        "updated_at": null,
        "voltage_range": 5.0
      },
      {
        "sym": "172",
        "x1": "256",
        "y1": "176",
        "x2": "256",
        "y2": "128",
        "flags": "0",
        "params": [
          "6",
          "5.0",
          "5.0",
          "0.0",
          "0.0",
          "0.5",
          "Voltage"
        ]
      },
      {
        "sym": "r",
        "x1": "256",
        "y1": "176",
        "x2": "256",
        "y2": "304",
        "flags": "0",
        "params": [
          "100.0"
        ]
      },
      {
        "sym": "g",
        "x1": "256",
        "y1": "304",
        "x2": "256",
        "y2": "352",
        "flags": "0",
        "params": [
        ]
      }
    ]

    @Circuit = CircuitLoader.createCircuitFromJsonData(@json)

    done()


  it "has 3 elements", ->
    expect(@Circuit.numElements()).to.equal(3)

  it "has correct initialization", ->
    expect(@Circuit.time).to.equal(0)
    expect(@Circuit.frames).to.equal(0)

  describe "before Analysis", ->
    beforeEach (done) ->
      @Solver = @Circuit.Solver
      done()

    it "exists", ->
      expect(@Solver).to.be

    it "initializes arrays to correct values", ->
      expect(@Solver.circuitMatrix).to.deep.equal([])
      expect(@Solver.circuitRightSide).to.deep.equal([])
      expect(@Solver.origMatrix).to.deep.equal([])
      expect(@Solver.origRightSide).to.deep.equal([])

    describe "After reconstructing circuit", ->
      beforeEach (done) ->
        @Solver.reconstruct()
        done()

      it "Sets circuitMatrix to correct value", ->
        expect(@Solver.circuitMatrix).to.deep.equal(
          [
            [1.0, 0.0, 0.0],
            [0.01, -1.0, 0.0],
            [-0.01, -0.0, -1.0]
          ]
        )

      it "Sets circuitRightSide to correct value", ->
        expect(@Solver.circuitRightSide).to.deep.equal([0, 0, 0])

      it "Sets circuitRowInfo to correct value", ->
        expect(@Solver.circuitRowInfo).to.deep.equal([])

      it "Sets circuitPermute to correct value", ->
        expect(@Solver.circuitPermute).to.deep.equal([2, 2, 2, 0])

      describe "solving circuit", ->
        beforeEach (done) ->
          @Circuit.updateCircuit()
          @Circuit.updateCircuit()
          @Circuit.updateCircuit()
          done()

        it "sets correct voltage on resistor", ->
          resistor = @Circuit.getElmByIdx(1)
          expect(resistor.getVoltageDiff()).to.eql(20)

        it "increments time", ->
          expect(@Circuit.time).to.equal(0.000005)
