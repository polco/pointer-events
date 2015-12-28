var PointerEvent = require('./pointer-event.js');

var domAPI = require('./dom-api.js');
var dispatchEvent = domAPI.dispatchEvent;
var hasListener = domAPI.hasListener;

var pointerPool = require('./pointer-pool.js');
var getPointerObject = pointerPool.getPointerObject;
var releasePointerObject = pointerPool.releasePointerObject;

var currentPointers = require('./current.js');
var addPointer = currentPointers.addPointer;
var updatePointer = currentPointers.updatePointer;
var removePointer = currentPointers.removePointer;


var events = [
  'pointerenter',
  'pointerleave',
  'pointerout',
  'pointercancel'
];

PointerEvent.prototype.initFromPointer = function (event) {
  this.pointerId = event.pointerId;
  this.pointerType = event.pointerType;
  this.x = event.clientX;
  this.y = event.clientY;
  this.target = event.target;
  this.originalEvent = event;
  this.type = event.type;
  return this;
}

function handleNativePointer(e) {
  if (!hasListener(e.type)) { return; }
  var pointerObject = getPointerObject();
  pointerObject.event.initFromPointer(e);
  dispatchEvent(pointerObject.event);
  releasePointerObject(pointerObject);
}

window.addEventListener('pointerdown', function (e) {
  addPointer(e.pointerId, e.pointerType, e.clientX, e.clientY, e.target);
  handleNativePointer(e);
}, true);

window.addEventListener('pointermove', function (e) {
  updatePointer(e.pointerId, e.clientX, e.clientY, e.target);
  handleNativePointer(e);
}, true);

window.addEventListener('pointerup', function (e) {
  removePointer(e.pointerId);
  handleNativePointer(e);
}, true);

for (var i = 0; i < events.length; i += 1) {
  window.addEventListener(events[i], handleNativePointer, true);
}
