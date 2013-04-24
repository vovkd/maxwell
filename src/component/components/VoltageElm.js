// Generated by CoffeeScript 1.4.0
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(['cs!Settings', 'cs!DrawHelper', 'cs!Polygon', 'cs!Rectangle', 'cs!Point', 'cs!CircuitComponent'], function(Settings, DrawHelper, Polygon, Rectangle, Point, CircuitComponent) {
    var VoltageElm;
    VoltageElm = (function(_super) {

      __extends(VoltageElm, _super);

      VoltageElm.FLAG_COS = 2;

      VoltageElm.WF_DC = 0;

      VoltageElm.WF_AC = 1;

      VoltageElm.WF_SQUARE = 2;

      VoltageElm.WF_TRIANGLE = 3;

      VoltageElm.WF_SAWTOOTH = 4;

      VoltageElm.WF_PULSE = 5;

      VoltageElm.WF_VAR = 6;

      VoltageElm.circleSize = 17;

      function VoltageElm(xa, ya, xb, yb, f, st) {
        VoltageElm.__super__.constructor.call(this, xa, ya, xb, yb, f, st);
        this.waveform = VoltageElm.WF_DC;
        this.frequency = 40;
        this.maxVoltage = 5;
        this.freqTimeZero = 0;
        this.bias = 0;
        this.phaseShift = 0;
        this.dutyCycle = 0.5;
        if (st) {
          if (typeof st === "string") {
            st = st.split(" ");
          }
          this.waveform = (st[0] ? Math.floor(parseInt(st[0])) : VoltageElm.WF_DC);
          this.frequency = (st[1] ? parseFloat(st[1]) : 40);
          this.maxVoltage = (st[2] ? parseFloat(st[2]) : 5);
          this.bias = (st[3] ? parseFloat(st[3]) : 0);
          this.phaseShift = (st[4] ? parseFloat(st[4]) : 0);
          this.dutyCycle = (st[5] ? parseFloat(st[5]) : 0.5);
        }
        if (this.flags & VoltageElm.FLAG_COS !== 0) {
          this.flags &= ~VoltageElm.FLAG_COS;
          this.phaseShift = Math.PI / 2;
        }
        this.reset();
      }

      VoltageElm.prototype.getDumpType = function() {
        return "v";
      };

      VoltageElm.prototype.dump = function() {
        return CircuitComponent.prototype.dump.call(this) + " " + this.waveform + " " + this.frequency + " " + this.maxVoltage + " " + this.bias + " " + this.phaseShift + " " + this.dutyCycle;
      };

      VoltageElm.prototype.reset = function() {
        this.freqTimeZero = 0;
        return this.curcount = 5;
      };

      VoltageElm.prototype.triangleFunc = function(x) {
        if (x < Math.PI) {
          return x * (2 / Math.PI) - 1;
        }
        return 1 - (x - Math.PI) * (2 / Math.PI);
      };

      VoltageElm.prototype.stamp = function() {
        if (this.waveform === VoltageElm.WF_DC) {
          return this.Circuit.Solver.Stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.getVoltage());
        } else {
          return this.Circuit.Solver.Stamper.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource);
        }
      };

      VoltageElm.prototype.doStep = function() {
        if (this.waveform !== VoltageElm.WF_DC) {
          return this.Circuit.Solver.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.getVoltage());
        }
      };

      VoltageElm.prototype.getVoltage = function() {
        var omega;
        omega = 2 * Math.PI * (this.Circuit.Solver.time - this.freqTimeZero) * this.frequency + this.phaseShift;
        switch (this.waveform) {
          case VoltageElm.WF_DC:
            return this.maxVoltage + this.bias;
          case VoltageElm.WF_AC:
            return Math.sin(omega) * this.maxVoltage + this.bias;
          case VoltageElm.WF_SQUARE:
            return this.bias + (omega % (2 * Math.PI) > (2 * Math.PI * this.dutyCycle) ? -this.maxVoltage : this.maxVoltage);
          case VoltageElm.WF_TRIANGLE:
            return this.bias + this.triangleFunc(omega % (2 * Math.PI)) * this.maxVoltage;
          case VoltageElm.WF_SAWTOOTH:
            return this.bias + (omega % (2 * Math.PI)) * (this.maxVoltage / Math.PI) - this.maxVoltage;
          case VoltageElm.WF_PULSE:
            if ((omega % (2 * Math.PI)) < 1) {
              return this.maxVoltage + this.bias;
            } else {
              return this.bias;
            }
            break;
          default:
            return 0;
        }
      };

      VoltageElm.prototype.setPoints = function() {
        VoltageElm.__super__.setPoints.call(this);
        return this.calcLeads((this.waveform === VoltageElm.WF_DC || this.waveform === VoltageElm.WF_VAR ? 8 : VoltageElm.circleSize * 2));
      };

      VoltageElm.prototype.draw = function(renderContext) {
        var ptA, ptB, _ref, _ref1;
        this.setBbox(this.x1, this.y2, this.x2, this.y2);
        this.draw2Leads(renderContext);
        if (this.waveform === VoltageElm.WF_DC) {
          _ref = DrawHelper.interpPoint2(this.lead1, this.lead2, 0, 10), ptA = _ref[0], ptB = _ref[1];
          renderContext.drawThickLinePt(this.lead1, ptA, DrawHelper.getVoltageColor(this.volts[0]));
          renderContext.drawThickLinePt(ptA, ptB, DrawHelper.getVoltageColor(this.volts[0]));
          this.setBboxPt(this.point1, this.point2, 16);
          _ref1 = DrawHelper.interpPoint2(this.lead1, this.lead2, 1, 16), ptA = _ref1[0], ptB = _ref1[1];
          renderContext.drawThickLinePt(ptA, ptB, DrawHelper.getVoltageColor(this.volts[1]));
        } else {
          this.setBboxPt(this.point1, this.point2, VoltageElm.circleSize);
          DrawHelper.interpPoint(this.lead1, this.lead2, 0.5, DrawHelper.ps1);
          this.drawWaveform(DrawHelper.ps1, renderContext);
        }
        this.drawPosts(renderContext);
        return this.drawDots(this.point1, this.point2, renderContext);
      };

      VoltageElm.prototype.drawWaveform = function(center, renderContext) {
        var color, i, ox, oy, valueString, wl, xc, xc2, xl, yc, yy;
        color = this.needsHighlight() ? Settings.FG_COLOR : void 0;
        xc = center.x;
        yc = center.y;
        renderContext.fillCircle(xc, yc, VoltageElm.circleSize, color);
        wl = 8;
        this.adjustBbox(xc - VoltageElm.circleSize, yc - VoltageElm.circleSize, xc + VoltageElm.circleSize, yc + VoltageElm.circleSize);
        xc2 = void 0;
        switch (this.waveform) {
          case VoltageElm.WF_DC:
            break;
          case VoltageElm.WF_SQUARE:
            xc2 = Math.floor(wl * 2 * this.dutyCycle - wl + xc);
            xc2 = Math.max(xc - wl + 3, Math.min(xc + wl - 3, xc2));
            renderContext.drawThickLine(xc - wl, yc - wl, xc - wl, yc, color);
            renderContext.drawThickLine(xc - wl, yc - wl, xc2, yc - wl, color);
            renderContext.drawThickLine(xc2, yc - wl, xc2, yc + wl, color);
            renderContext.drawThickLine(xc + wl, yc + wl, xc2, yc + wl, color);
            renderContext.drawThickLine(xc + wl, yc, xc + wl, yc + wl, color);
            break;
          case VoltageElm.WF_PULSE:
            yc += wl / 2;
            renderContext.drawThickLine(xc - wl, yc - wl, xc - wl, yc, color);
            renderContext.drawThickLine(xc - wl, yc - wl, xc - wl / 2, yc - wl, color);
            renderContext.drawThickLine(xc - wl / 2, yc - wl, xc - wl / 2, yc, color);
            renderContext.drawThickLine(xc - wl / 2, yc, xc + wl, yc, color);
            break;
          case VoltageElm.WF_SAWTOOTH:
            renderContext.drawThickLine(xc, yc - wl, xc - wl, yc, color);
            renderContext.drawThickLine(xc, yc - wl, xc, yc + wl, color);
            renderContext.drawThickLine(xc, yc + wl, xc + wl, yc, color);
            break;
          case VoltageElm.WF_TRIANGLE:
            xl = 5;
            renderContext.drawThickLine(xc - xl * 2, yc, xc - xl, yc - wl, color);
            renderContext.drawThickLine(xc - xl, yc - wl, xc, yc, color);
            renderContext.drawThickLine(xc, yc, xc + xl, yc + wl, color);
            renderContext.drawThickLine(xc + xl, yc + wl, xc + xl * 2, yc, color);
            break;
          case VoltageElm.WF_AC:
            xl = 10;
            ox = -1;
            oy = -1;
            i = -xl;
            while (i <= xl) {
              yy = yc + Math.floor(0.95 * Math.sin(i * Math.PI / xl) * wl);
              if (ox !== -1) {
                renderContext.drawThickLine(ox, oy, xc + i, yy, color);
              }
              ox = xc + i;
              oy = yy;
              i++;
            }
            break;
        }
        if (Settings.showValuesCheckItem) {
          valueString = CircuitComponent.getShortUnitText(this.frequency, "Hz");
          if (this.dx === 0 || this.dy === 0) {
            return this.drawValues(valueString, VoltageElm.circleSize);
          }
        }
      };

      VoltageElm.prototype.getVoltageSourceCount = function() {
        return 1;
      };

      VoltageElm.prototype.getPower = function() {
        return -this.getVoltageDiff() * this.current;
      };

      VoltageElm.prototype.getVoltageDiff = function() {
        return this.volts[1] - this.volts[0];
      };

      VoltageElm.prototype.getInfo = function(arr) {
        var i;
        switch (this.waveform) {
          case VoltageElm.WF_DC:
          case VoltageElm.WF_VAR:
            arr[0] = "voltage source";
            break;
          case VoltageElm.WF_AC:
            arr[0] = "A/C source";
            break;
          case VoltageElm.WF_SQUARE:
            arr[0] = "square wave gen";
            break;
          case VoltageElm.WF_PULSE:
            arr[0] = "pulse gen";
            break;
          case VoltageElm.WF_SAWTOOTH:
            arr[0] = "sawtooth gen";
            break;
          case VoltageElm.WF_TRIANGLE:
            arr[0] = "triangle gen";
        }
        arr[1] = "I = " + CircuitComponent.getCurrentText(this.getCurrent());
        arr[2] = (this instanceof RailElm ? "V = " : "Vd = ") + CircuitComponent.getVoltageText(this.getVoltageDiff());
        if (this.waveform !== VoltageElm.WF_DC && this.waveform !== VoltageElm.WF_VAR) {
          arr[3] = "f = " + CircuitComponent.getUnitText(this.frequency, "Hz");
          arr[4] = "Vmax = " + CircuitComponent.getVoltageText(this.maxVoltage);
          i = 5;
          if (this.bias !== 0) {
            arr[i++] = "Voff = " + this.getVoltageText(this.bias);
          } else {
            if (this.frequency > 500) {
              arr[i++] = "wavelength = " + CircuitComponent.getUnitText(2.9979e8 / this.frequency, "m");
            }
          }
          return arr[i++] = "P = " + CircuitComponent.getUnitText(this.getPower(), "W");
        }
      };

      VoltageElm.prototype.getEditInfo = function(n) {
        var ei;
        if (n === 0) {
          return new EditInfo((this.waveform === VoltageElm.WF_DC ? "Voltage" : "Max Voltage"), this.maxVoltage, -20, 20);
        }
        if (n === 1) {
          ei = new EditInfo("Waveform", this.waveform, -1, -1);
          ei.choice = new Array();
          ei.choice.push("D/C");
          ei.choice.push("A/C");
          ei.choice.push("Square Wave");
          ei.choice.push("Triangle");
          ei.choice.push("Sawtooth");
          ei.choice.push("Pulse");
          ei.choice.push(this.waveform);
          return ei;
        }
        if (this.waveform === VoltageElm.WF_DC) {
          return null;
        }
        if (n === 2) {
          return new EditInfo("Frequency (Hz)", this.frequency, 4, 500);
        }
        if (n === 3) {
          return new EditInfo("DC Offset (V)", this.bias, -20, 20);
        }
        if (n === 4) {
          return new EditInfo("Phase Offset (degrees)", this.phaseShift * 180 / Math.PI, -180, 180).setDimensionless();
        }
        if (n === 5 && this.waveform === VoltageElm.WF_SQUARE) {
          return new EditInfo("Duty Cycle", this.dutyCycle * 100, 0, 100).setDimensionless();
        }
      };

      VoltageElm.prototype.setEditValue = function(n, ei) {
        var adj, maxfreq, oldfreq, waveform, _ref, _ref1, _ref2;
        if (n === 0) {
          this.maxVoltage = ei.value;
        }
        if (n === 3) {
          this.bias = ei.value;
        }
        if (n === 2) {
          oldfreq = this.frequency;
          this.frequency = ei.value;
          maxfreq = 1 / (8 * ((_ref = this.Circuit) != null ? _ref.timeStep : void 0));
          if (this.frequency > maxfreq) {
            this.frequency = maxfreq;
          }
          adj = this.frequency - oldfreq;
          this.freqTimeZero = ((_ref1 = this.Circuit) != null ? _ref1.time : void 0) - oldfreq * (((_ref2 = this.Circuit) != null ? _ref2.time : void 0) - this.freqTimeZero) / this.frequency;
        }
        if (n === 1) {
          waveform = this.waveform;
          if (this.waveform === VoltageElm.WF_DC && waveform !== VoltageElm.WF_DC) {
            this.bias = 0;
          } else {
            this.waveform !== VoltageElm.WF_DC && waveform === VoltageElm.WF_DC;
          }
          if ((this.waveform === VoltageElm.WF_SQUARE || waveform === VoltageElm.WF_SQUARE) && this.waveform !== waveform) {
            this.setPoints();
          }
        }
        if (n === 4) {
          this.phaseShift = ei.value * Math.PI / 180;
        }
        if (n === 5) {
          return this.dutyCycle = ei.value * 0.01;
        }
      };

      VoltageElm.prototype.toString = function() {
        return "VoltageElm";
      };

      return VoltageElm;

    })(CircuitComponent);
    return VoltageElm;
  });

}).call(this);
