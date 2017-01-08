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
    .on('set', this.setPowerState.bind(this));
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

RoombaAccessory.prototype.setPowerState = function(powerOn, callback) {
  var cmd = powerOn ? "start" : "pause";
  var accessory = this;
  this.sendRequest("multipleFieldSet", { "remoteCommand": cmd }, function(err, httpResponse, body) {
    accessory.log("Did send request");
    accessory.log(httpResponse.request.headers);
    accessory.log(httpResponse.statusCode);
    accessory.log(body);
    accessory.log(err);
    accessory.log(httpResponse.request.body);
    if (err) {
      accessory.log("Could not change power state of Roomba: %s", err);
      return;
    }
    callback();
  });
}
