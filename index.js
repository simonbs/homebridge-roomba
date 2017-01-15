var Roomba = require("roomba");
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-roomba", "Roomba", RoombaAccessory);
}

function RoombaAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.roomba = new Roomba(config["blid"], config["robotpwd"], config["assetid"]);
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

RoombaAccessory.prototype.isRunning = function(callback) {
  this.roomba.isRunning(callback);
}

RoombaAccessory.prototype.setPowerState = function(powerOn, callback) {
  if (powerOn) {
    this.roomba.start(callback);
  } else {
    this.roomba.pauseAndDock(callback);
  }
}
