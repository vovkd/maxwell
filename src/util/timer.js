// Generated by CoffeeScript 1.4.0
(function() {

  define([], function() {
    var Timer;
    Timer = (function() {

      function Timer() {}

      Timer.tick = function(timer_name) {
        this.timers || (this.timers = {});
        return this.timers[timer_name] = (new Date()).getTime();
      };

      Timer.tock = function(timer_name) {
        this.timers || (this.timers = {});
        if (this.timers[timer_name]) {
          return (new Date()).getTime() - this.timers[timer_name];
        } else {
          return console.log("Could not find timer " + timer_name);
        }
      };

      return Timer;

    })();
    return Timer;
  });

}).call(this);