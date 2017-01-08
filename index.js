var request = require("request");
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-roomba", "Roomba", RoombaAccessory);
}

function RoombaAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.blid = config["blid"];
  this.robotpwd = config["robotpwd"];
  this.assetId = config["assetid"];
}

RoombaAccessory.prototype.getServices = function() {
  var switchService = new Service.Switch(this.name);
  switchService
    .getCharacteristic(Characteristic.On)
    .on('set', this.setPowerState.bind(this))
    .on("get", this.isRunning.bind(this));
  return [ switchService ]
}

RoombaAccessory.prototype.identify = function(callback) {
  callback();
}

RoombaAccessory.prototype.sendRequest = function(method, value, callback) {
  var form = {
    "blid": this.blid,
    "robotpwd": this.robotpwd,
    "method": method
  }
  if (value != null) {
    form["value"] = JSON.stringify(value);
  }
  request.post({
    url: "https://irobot.axeda.com/services/v1/rest/Scripto/execute/AspenApiRequest", 
    form: form,
    headers: {
      "ASSET-ID": this.assetId
    }
  }, callback);
}

RoombaAccessory.prototype.getStatus = function(callback) {
  var accessory = this;
  this.sendRequest("getStatus", null, function(err, httpResponse, body) {
    if (err || httpResponse.statusCode != 200) {
      accessory.log("Could not get status from Roomba: %s", err);
      return callback(err, null);
    }
    var json = JSON.parse(body);
    var theStatus = json;
    theStatus["robot_status"] = JSON.parse(json["robot_status"]);
    callback(null, theStatus);
  });
}

RoombaAccessory.prototype.pollPhase = function(desiredPhase, callback) {
  var accessory = this;
  this.getStatus(function(err, theStatus) {
    if (err) {
      return callback(err);
    }
    if (theStatus.robot_status.phase == desiredPhase) {
      return callback(null);
    }
    setTimeout(function() {
      accessory.pollStatusPhase(desiredPhase, callback);
    }, 3000);
  });
}

RoombaAccessory.prototype.pauseAndDock = function(callback) {
  var accessory = this;
  this.sendRequest("multipleFieldSet", {"remoteCommand": "pause"}, function(err, httpResponse, body) {
    if (err || httpResponse.statusCode != 200) {
      accessory.log("Could not pause Roomba: %s", err);
      return callback(err);
    }
    accessory.pollPhase("stop", function(err) {
      if (err) {
        return callback(err);
      }
      accessory.sendRequest("multipleFieldSet", {"remoteCommand": "dock"}, function(err, httpResponse, body) {
        if (err || httpResponse.statusCode != 200) {
          accessory.log("Could not dock Roomba: %s", err);
          callback(err);
          return;
        }
        callback();
      });
    });
  });
}

RoombaAccessory.prototype.start = function(callback) {
  this.sendRequest("multipleFieldSet", { "remoteCommand": "start" }, function(err, httpResponse, body) {
    if (err || httpResponse.statusCode != 200) {
      accessory.log("Could not start Roomba: %s", err);
      return callback(err);
    }
    callback();
  });
}

RoombaAccessory.prototype.isRunning = function(callback) {
  this.getStatus(function(err, theStatus) {
    if (err) {
      return callback(err);
    }
    return callback(null, theStatus.robot_status.phase == "run")
  });
}

RoombaAccessory.prototype.setPowerState = function(powerOn, callback) {
  if (powerOn) {
    this.start(callback);
  } else {
    this.pauseAndDock(callback);
  }
}
