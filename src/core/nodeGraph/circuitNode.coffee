class CircuitNode
  constructor: (@x=0, @y=0, @intern=false, @links=[]) ->

  toString: () ->
    "CircuitNode: #{@x} #{@y} #{@intern} [#{@links.toString()}]"

class CircuitNodeLink
  constructor: (@num=0, @elm=null) ->

  toString: () ->
    "#{@num} #{@elm.toString()}"

exports.CircuitNode = CircuitNode
exports.CircuitNodeLink = CircuitNodeLink