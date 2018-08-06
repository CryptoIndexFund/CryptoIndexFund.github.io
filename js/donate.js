// Support old browsers
if (typeof Object.assign != 'function') {
  Object.assign = function(target) {
    'use strict';
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    target = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];
      if (source != null) {
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };
}

!function(c){var t=document.createElement("script");t.type="text/javascript",t.async=!0,t.onload=c,t.src="//lab.subinsb.com/projects/francium/cryptodonate/widget.js";var e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(t,e)}(function(){
    Fr.loadCD("donate-btc", {
        coin: "bitcoin",
        address: "3NLXczbXEDA6EKS6a8d4BUd1ck9Eu1ASeW"
    });
    Fr.loadCD("donate-eth", {
        coin: "ethereum",
        address: "0xbC41Bc726929AF9c3B2558f339De59c14b87e4Dd"
    });
});
