# Step 2: Prototype of DepthRectangle is Rectangle

# Step 3: Now we need to set the constructor to the DepthRectangle instead of Rectangle
WireElm = (xa, ya, xb, yb, f, st) ->
  CircuitElement.call this, xa, ya, xb, yb, f, st
WireElm:: = new CircuitElement()
WireElm::constructor = WireElm
WireElm.FLAG_SHOWCURRENT = 1
WireElm.FLAG_SHOWVOLTAGE = 2
WireElm::draw = ->
  color = @setVoltageColor(@volts[0])
  @doDots()
  CircuitElement.drawThickLinePt @point1, @point2, color
  @setBboxPt @point1, @point2, 3
  if @mustShowCurrent()
    s = CircuitElement.getShortUnitText(Math.abs(@getCurrent()), "A")
    @drawValues s, 4
  else if @mustShowVoltage()
    s = CircuitElement.getShortUnitText(@volts[0], "V")
    @drawValues s, 4
  @drawPosts()

WireElm::stamp = ->
  Circuit.stampVoltageSource @nodes[0], @nodes[1], @voltSource, 0

WireElm::mustShowCurrent = ->
  (@flags & WireElm.FLAG_SHOWCURRENT) isnt 0

WireElm::mustShowVoltage = ->
  (@flags & WireElm.FLAG_SHOWVOLTAGE) isnt 0

WireElm::getVoltageSourceCount = ->
  1

WireElm::getInfo = (arr) ->
  arr[0] = "Wire"
  arr[1] = "I = " + CircuitElement.getCurrentDText(@getCurrent())
  arr[2] = "V = " + CircuitElement.getVoltageText(@volts[0])

WireElm::getEditInfo = (n) ->


# TODO:
#    if(n==0) {
#        var ei:EditInfo = new EditInfo("", 0, -1, -1);
#        //ei.checkbox = new Checkbox("Show Current", mustShowCurrent());
#        return ei;
#    }
#    if( n==1) {
#        var ei:EditInfo = new EditInfo("", 0, -1, -1);
#        //ei.checkbox = new Checkbox("Show Voltage", mustShowVoltage());
#        return ei;
#    }
#    return null;
WireElm::setEditValue = (n, ei) ->


# TODO:
#    if(n==0) {
#        if(ei.isChecked)
#            flags = FLAG_SHOWCURRENT;
#        else
#            flags &= ~FLAG_SHOWCURRENT;
#    }
#    if( n==1 ) {
#        if(ei.isChecked)
#            flags = FLAG_SHOWVOLTAGE;
#        else
#            flags &- ~FLAG_SHOWVOLTAGE;
#    }
WireElm::getDumpType = ->
  "w"

WireElm::getPower = ->
  0

WireElm::getVoltageDiff = ->
  @volts[0]

WireElm::isWire = ->
  true

WireElm::needsShortcut = ->
  true