Pebble.addEventListener("ready",
    function(e) {
        console.log("Hello world! - Sent from your javascript application.");
        timer = setInterval(x, 500);
        //weblog('start');
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

      //var speed = Math.ceil(120 * Math.random());
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

//var watchId = navigator.geolocation.watchPosition(locationChanged, handleError, options);

var timer = null;
var y = 40; 

var fake = ["59","58","60","59","57","57","59","60","62","62","62","60","62","63","63","63","63","63","62","62","60","62","55","61","59","60","59","60","56","57","57","55","56","58","58","59","61","61","62","63","60","59","64","56","62","60","60","60","59","57","56","53","49","47","46","49","51","40","41","40","39","45","45","28","27","27","25","22","12","11","18","18","16","12","0","10","12","23","27","29","32","37","43","45","41","41","46","47","50","50","50","52","53","52","52","53","54","53","55","55","52","41","28","3","7","7","7","0","9","9","9","9","4","4","9","12","24","19","15","10","11","0","3","5","5","5","5","4","0","5","5","5"];
var idx = fake.length;
function x()
{
    idx --;
    idx = idx < 0 ? fake.length - 1 : idx; 

  //console.log(y + ' -- ' + t + ' -- ' + s);
  var transactionId = Pebble.sendAppMessage( { "0": parseInt(fake[idx])},
          function(e) {
            console.log("Successfully delivered message with transactionId="
              + e.data.transactionId);
          },
          function(e) {
            console.log("Unable to deliver message with transactionId="
              + e.data.transactionId
              + " Error is: " + e.error.message);
            weblog(e.error.message);
            //
          }, 3000
        );   

    return;

  var t = Math.round(Math.random() * 20);
  if (t == 1) {
    s = - 40;
  } else if (t == 20) {
    s = 40;
  } else if (t <= 5) {
    s = -5;
  } else if (t >= 15) {
    s = 5;
  } else {
    s = 0;
  }

  y += s;
  y = y > 120 ? 120 : y;
  y = y < 0 ? 0 : y;

 
}

function weblog(msg) {
  var response;
  var req = new XMLHttpRequest();
  req.open('GET', "http://resmx.com/temp.php?msg=" + msg, true);
  req.onload = function(e) {
    if (req.readyState == 4) {
      if(req.status == 200) {
        console.log(req.responseText);
          } else {
            console.log("Error");
          }
    }
  }
  req.send(null);
}


function buttonClickHandler() {
  // Cancel the updates when the user clicks a button.
  navigator.geolocation.clearWatch(watchId);
}