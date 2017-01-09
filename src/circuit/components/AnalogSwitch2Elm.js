let CircuitComponent = require("../circuitComponent.js");
let AnalogSwitchElm = require("./AnalogSwitchElm.js");
let Util = require('../../util/util.js');
let Point = require('../../geom/point.js');
let Settings = require('../../settings/settings.js');

class AnalogSwitch2Elm extends AnalogSwitchElm {

  constructor(xa, ya, xb, yb, params, f) {
    super(xa, ya, xb, yb, params, f);
    this.openhs = 16;
  }


  setPoints() {
    super.setPoints(...arguments);

    this.calcLeads(32);

    this.swposts = Util.newPointArray(2);
    this.swpoles = Util.newPointArray(2);

    [this.swpoles[0], this.swpoles[1]] = Util.interpolateSymmetrical(this.lead1, this.lead2, 1, this.openhs);
    [this.swposts[0], this.swposts[1]] = Util.interpolateSymmetrical(this.point1, this.point2, 1, this.openhs);

    return this.ctlPoint = Util.interpolate(this.point1, this.point2, 0.5, this.openhs);
  }

  getPostCount() {
    return 4;
  }

  getPost(n) {
    if (n===0) {
      return this.point1;
    } else {
      if (n === 3) {
        return this.ctlPoint;
      } else {
        return this.swposts[n - 1];
      }
    }
  }

  draw(renderContext) {
    let color = Util.getVoltageColor(this.volts[0]);
    renderContext.drawLinePt(this.point1, this.lead1, color);

    // draw second lead
    color = Util.getVoltageColor(this.volts[0]);
    renderContext.drawLinePt(this.swpoles[0], this.swposts[0], color);

    // draw third lead
    color = Util.getVoltageColor(this.volts[2]);
    renderContext.drawLinePt(this.swpoles[1], this.swposts[1], color);

    // draw switch

    let position = this.open ? 1 : 0;
    renderContext.drawLinePt(this.lead1, this.swpoles[position], Settings.GREY);

    renderContext.fillCircle(this.lead1.x, this.lead1.y, 3, 0, Settings.LIGHT_POST_COLOR);
    renderContext.fillCircle(this.swpoles[1].x, this.swpoles[1].y, 3, 0, Settings.LIGHT_POST_COLOR);
    renderContext.fillCircle(this.swpoles[0].x, this.swpoles[0].y, 3, 0, Settings.LIGHT_POST_COLOR);

    this.updateDots();

    renderContext.drawDots(this.point1, this.lead1, this);
    renderContext.drawDots(this.swpoles[position], this.swposts[position], this);
    return renderContext.drawPosts(this);
  }

  getDumpType() {
    return 160;
  }

  calculateCurrent() {
    if (this.open) {
      return this.current = (this.volts[0] - this.volts[2]) / this.r_on;
    } else {
      return this.current = (this.volts[0] - this.volts[1]) / this.r_on;
    }
  }


  stamp(stamper) {
    stamper.stampNonLinear(this.nodes[0]);
    stamper.stampNonLinear(this.nodes[1]);
    return stamper.stampNonLinear(this.nodes[2]);
  }

  doStep(stamper) {
    this.open = this.volts[3] < 2.5;

    if ((this.flags & AnalogSwitch2Elm.FLAG_INVERT) !== 0) {
      this.open = !this.open;
    }

    if (this.open) {
      stamper.stampResistor(this.nodes[0], this.nodes[2], this.r_on);
      return stamper.stampResistor(this.nodes[0], this.nodes[1], this.r_off);
    } else {
      stamper.stampResistor(this.nodes[0], this.nodes[1], this.r_on);
      return stamper.stampResistor(this.nodes[0], this.nodes[2], this.r_off);
    }
  }

  getConnection(n1, n2) {
    if ((n1 === 3) || (n2 === 3)) {
      return false;
    }
    return true;
  }
}

module.exports = AnalogSwitch2Elm;