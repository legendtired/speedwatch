Pebble.addEventListener("ready",
    function(e) {
        console.log("ready");
    }
);

Pebble.addEventListener("appmessage", function(e) {
  console.log("Got message: " + JSON.stringify(e));
});

var p1 = null;
var p2 = null;

var R = 6371; // km

function toRad(d) {
  return d * Math.PI / 180;  
}

function distance(lat1, lat2, lon1, lon2) {

    var dLat = toRad(lat2-lat1);
    var dLon = toRad(lon2-lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;

    return d;
}

function getSpeedByP1P2() {
    
    if (!p1) {
        return false;
    }

    var t = (p2.timestamp - p1.timestamp) / 1000;
    if (t > 1800) {
        return false;
    }

    var d = distance(p1.coords.latitude, p2.coords.latitude, p1.coords.longitude, p2.coords.longitude);
    if (d < 1) {
        return false;
    }

    var tmpSpeed = d / t;
    console.log(tmpSpeed);
    speed = Math.round(tmpSpeed * 3.6);

    return speed;
}

function locationChanged(position) {
      // Scrolls the map so that it is centered at (position.coords.latitude, position.coords.longitude).

      var speed = 255;
      if (position.coords.speed) {
        var speed = Math.round(position.coords.speed * 3600 / 1000);
      }

      p1 = p2;
      p2 = position;

      if (speed == 255) {
        var ts = getSpeedByP1P2();
        if (ts !== false) {
            //speed = ts;
        }
      }

      console.log('speed:' + position.coords.speed + '-' + speed);
        var transactionId = Pebble.sendAppMessage( { "0": speed},
          function(e) {
            //console.log("Successfully delivered message with transactionId="+ e.data.transactionId);
          },
          function(e) {
            console.log("Unable to deliver message with transactionId="
              + e.data.transactionId
              + " Error is: " + e.error.message);
          },
          3000
        );      
}

function handleError(error) {
  // Update a div element with error.message.
  var msg = 'watch position error: ';

    switch(error.code){
        case error.TIMEOUT:
            // Timeout
            msg += 'timeout';
            break;
        case error.POSITION_UNAVAILABLE:
            // Position unavailable
            msg += 'position unavaliable';
            break;
        case error.PERMISSION_DENIED:
            // Permission denied
            msg += 'permission denied';
            break;
        case error.UNKNOWN_ERROR:
            // Unknown error
            msg += 'unknown';
            break;
        default: 
            msg += '--';
            break;
    }

    console.log(msg);
}

// Request repeated updates.
var options = {
    enableHighAccuracy: true,
    maximumAge: 300000, 
    timeout: 5000 
};

var watchId = navigator.geolocation.watchPosition(locationChanged, handleError, options);

function buttonClickHandler() {
  // Cancel the updates when the user clicks a button.
  navigator.geolocation.clearWatch(watchId);
}