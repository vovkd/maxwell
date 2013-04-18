// Generated by CoffeeScript 1.4.0
(function() {

  define(['cs!MathUtils'], function(MathUtils) {
    return describe("Math utilities", function() {
      describe("MathUtils.sign(x)", function() {
        it("should return 1 for a positive number", function() {
          MathUtils.sign(1).should.equal(1);
          MathUtils.sign(5e6).should.equal(1);
          return MathUtils.sign(.001).should.equal(1);
        });
        it("should return 0 for an argument of 0", function() {
          return MathUtils.sign(0).should.equal(0);
        });
        return it("should return -1 for an argument of 0", function() {
          MathUtils.sign(-0.0001).should.equal(-1);
          MathUtils.sign(-1).should.equal(-1);
          return MathUtils.sign(-1e9).should.equal(-1);
        });
      });
      return describe("MathUtils.isInfinite(x)", function() {
        it("should return true for Infinity", function() {
          return MathUtils.isInfinite(Infinity).should.equal(true);
        });
        it("should return true for a value larger than 1e18", function() {
          return MathUtils.isInfinite(1.01e18).should.equal(true);
        });
        return it("should not be infinite", function() {
          return MathUtils.isInfinite(1.99e17).should.equal(false);
        });
      });
    });
  });

}).call(this);