// Generated by CoffeeScript 1.4.0
(function() {

  define([], function() {
    var ClassUtils;
    ClassUtils = (function() {

      function ClassUtils() {}

      ClassUtils.extend = function(obj, mixin) {
        var method, name;
        for (name in mixin) {
          method = mixin[name];
          obj[name] = method;
        }
        return obj;
      };

      ClassUtils.include = function(klass, mixin) {
        return extend(klass.prototype, mixin);
      };

      ClassUtils.type = function(o) {
        return !!o && Object.prototype.toString.call(o).match(/(\w+)\]/)[1];
      };

      return ClassUtils;

    })();
    return ClassUtils;
  });

}).call(this);
