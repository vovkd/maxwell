let CircuitComponent = require('../circuitComponent.js');
let Settings = require('../../settings/settings.js');
let Polygon = require('../../geom/polygon.js');
let Rectangle = require('../../geom/rectangle.js');
let Point = require('../../geom/point.js');
let Util = require("../../util/util.js");

let VoltageElm = require('./VoltageElm.js');


class RailElm extends VoltageElm {
  static initClass() {
    this.FLAG_CLOCK = 1;
  }

  constructor(xa, ya, xb, yb, params, f) {
    super(xa, ya, xb, yb, params, f);
  }

  getDumpType() {
    return "R";
  }

  getPostCount() {
    return 1;
  }

  draw(renderContext) {
    this.lead1 = Util.interpolate(this.point1, this.point2, 1 - (VoltageElm.circleSize / this.dn()));

    this.setBboxPt(this.point1, this.point2, this.circleSize);
    renderContext.drawLinePt(this.point2, this.lead1, Settings.STROKE_COLOR, Settings.LINE_WIDTH+1);
    renderContext.drawLinePt(this.point2, this.point1, Settings.STROKE_COLOR);

    let color = Util.getVoltageColor(this.volts[0]);
    renderContext.drawLinePt(this.point1, this.lead1, color);

    let clock = (this.waveform === VoltageElm.WF_SQUARE) && ((this.flags & VoltageElm.FLAG_CLOCK) !== 0);

    this.updateDots();

//    renderContext.drawDots @point2, @point1, this
    renderContext.drawDots(this.lead1, this.point1, this);
    renderContext.drawPosts(this);

    if ((this.waveform === VoltageElm.WF_DC) || (this.waveform === VoltageElm.WF_VAR) || clock) {
      color = "#FFFFFF";  //((if @needsHighlight() then Settings.SELECT_COLOR else "#FFFFFF"))

      //this.setPowerColor(g, false);
      let v = this.getVoltage();

      let s = Util.getUnitText(v, "V");
      if (Math.abs(v) < 1) { s = v + "V"; } //showFormat.format(v)
      if (this.getVoltage() > 0) { s = `+${s}`; }

      renderContext.fillText(s, this.point2.x, this.point2.y - 5);

//      s = "Ant" if this instanceof AntennaElm
      if (clock) { s = "CLK"; }

      return Util.drawValue(0, 0, this, s);
    } else {
      return this.drawWaveform(this.point2, renderContext);
    }
  }

//    if CircuitComponent.DEBUG
//      super(renderContext)


//    renderContext.drawDots @point1, @lead1, this # @curcount  unless Circuit.dragElm is this

  getVoltageDiff() {
    return this.volts[0];
  }

//    getVoltage: ->
//      super()

  setPoints() {
    super.setPoints(...arguments);

    this.lead1 = Util.interpolate(this.point1, this.point2, 1 - (this.circleSize / this.dn()));
  }

  stamp(stamper) {
//    console.log("\n::Stamping RailElm:: " + @waveform)
    if (this.waveform === VoltageElm.WF_DC) {
      return stamper.stampVoltageSource(0, this.nodes[0], this.voltSource, this.getVoltage());
    } else {
      return stamper.stampVoltageSource(0, this.nodes[0], this.voltSource);
    }
  }
//    stamper.stampVoltageSource 0, @nodes[0], @voltSource

  doStep(stamper) {
//    e = new Error("DOSTEP")

//    console.log(e.stack)
//    console.log("WF", @waveform, @voltSource, @getVoltage())
    if (this.waveform !== VoltageElm.WF_DC) {
      return stamper.updateVoltageSource(0, this.nodes[0], this.voltSource, this.getVoltage());
    }
  }

  hasGroundConnection(n1) {
    return true;
  }
}
RailElm.initClass();

module.exports = RailElm;
