var domAPI = require('./dom-api.js');
var dispatchEvent = domAPI.dispatchEvent;
var dispatchEventOn = domAPI.dispatchEventOn;
var hasListener = domAPI.hasListener;

var pointerEventTypes = require('./core.js').pointerEventTypes;

var pointerPool = require('./pointer-pool.js');
var getPointerObject = pointerPool.getPointerObject;
var releasePointerObject = pointerPool.releasePointerObject;

var getPath = require('./utils.js').getPath;

var pointersInfo = {};
var primaryId = null;

var MINIMUM_DISTANCE_BETWEEN_MOVES = 15;
var MAXIMUM_TIME_BETWEEN_MOVES = 50;

function start(e, primaryPointerId) {
  primaryId = primaryPointerId;
  var hasOverListener = hasListener(pointerEventTypes.over);
  var hasEnterListener = hasListener(pointerEventTypes.enter);

  var touches = e.changedTouches;
  var pointerObject = getPointerObject();
  var pointerEvent = pointerObject.event;
  for (var i = 0; i < touches.length; i += 1) {
    var touch = touches[i];
    var isPrimary = touch.identifier === primaryId;
    pointerEvent._initFromTouch(e, touch, pointerEventTypes.over, isPrimary);

    if (hasOverListener) {
      dispatchEvent(pointerEvent);
    }

    var pointerInfo = {
      path: getPath(pointerEvent.target),
      timeStamp: e.timeStamp,
      target: pointerEvent.target,
      x: pointerEvent.clientX,
      y: pointerEvent.clientY
    };
    pointersInfo[touch.identifier] = pointerInfo;

    if (hasEnterListener) {
      pointerEvent._initFromTouch(e, touch, pointerEventTypes.enter, isPrimary);
      pointerEvent.target = pointerInfo.path[0];
      for (var j = 0; j < pointerInfo.path.length; j += 1) {
        dispatchEventOn(pointerEvent, pointerInfo.path[j]);
      }
    }
  }
  releasePointerObject(pointerObject);
}

function updateTarget(pointerInfo, e, touch, isPrimary) {
  var target = document.elementFromPoint(pointerInfo.x, pointerInfo.y);
  if (!target || target === pointerInfo.target) { return; }

  var pointerObject = getPointerObject();
  var pointerEvent = pointerObject.event;

  if (hasListener(pointerEventTypes.out)) {
    pointerEvent._initFromTouch(e, touch, pointerEventTypes.out, isPrimary);
    pointerEvent.target = pointerInfo.target;
    pointerEvent.relatedTarget = null;
    dispatchEvent(pointerEvent);
  }

  var newPath = getPath(target);
  var oldPath = pointerInfo.path;
  var newPathIndex = newPath.length;
  var oldPathIndex = oldPath.length;

  for (; newPathIndex >= 0 && oldPathIndex >= 0; newPathIndex -= 1, oldPathIndex -= 1) {
    if (newPath[newPathIndex] !== oldPath[oldPathIndex]) { break; }
  }

  if (hasListener(pointerEventTypes.leave)) {
    pointerEvent._initFromTouch(e, touch, pointerEventTypes.leave, isPrimary);
    pointerEvent.relatedTarget = target;
    pointerEvent.target = oldPath[0];
    for (var i = 0; i <= oldPathIndex; i += 1) {
      dispatchEventOn(pointerEvent, oldPath[i]);
    }
  }

  if (hasListener(pointerEventTypes.over)) {
    pointerEvent._initFromTouch(e, touch, pointerEventTypes.over, isPrimary);
    pointerEvent.target = target;
    pointerEvent.relatedTarget = null;
    dispatchEvent(pointerEvent);
  }

  if (hasListener(pointerEventTypes.enter)) {
    pointerEvent._initFromTouch(e, touch, pointerEventTypes.enter, isPrimary);
    pointerEvent.relatedTarget = pointerInfo.target;
    pointerEvent.target = newPath[0];
    for (var i = 0; i <= newPathIndex; i += 1) {
      dispatchEventOn(pointerEvent, newPath[i]);
    }
  }

  releasePointerObject(pointerObject);
  pointerInfo.target = target;
  pointerInfo.path = newPath;
}

function move(e) {
  if (hasListener(pointerEventTypes.enter) ||
    hasListener(pointerEventTypes.leave) ||
    hasListener(pointerEventTypes.over) ||
    hasListener(pointerEventTypes.out)) {
    var touches = e.changedTouches;
    for (var i = 0; i < touches.length; i += 1) {
      var touch = touches[i];
      var pointerInfo = pointersInfo[touch.identifier];

      if ((Math.abs(touch.clientX - pointerInfo.x) > MINIMUM_DISTANCE_BETWEEN_MOVES) ||
        (Math.abs(touch.clientY - pointerInfo.y) > MINIMUM_DISTANCE_BETWEEN_MOVES) ||
        (e.timeStamp - pointerInfo.timeStamp > MAXIMUM_TIME_BETWEEN_MOVES)) {
        pointerInfo.x = touch.clientX;
        pointerInfo.y = touch.clientY;
        updateTarget(pointerInfo, e, touch, touch.identifier === primaryId);
      }
      pointerInfo.timeStamp = e.timeStamp;
    }
  }

  return pointersInfo;
}

function end(e, primaryPointerId) {
  primaryId = primaryPointerId;

  var hasLeaveListener = hasListener(pointerEventTypes.leave);
  var hasOutListener = hasListener(pointerEventTypes.out);
  var touches = e.changedTouches;
  var pointerObject = getPointerObject();
  var pointerEvent = pointerObject.event;
  for (var i = 0; i < touches.length; i += 1) {
    var touch = touches[i];
    var pointerInfo = pointersInfo[touch.identifier];
    var isPrimary = touch.identifier === primaryId;

    if (hasOutListener) {
      pointerEvent._initFromTouch(e, touch, pointerEventTypes.out, isPrimary, true);
      pointerEvent.target = pointerInfo.target;
      dispatchEvent(pointerEvent);
    }

    if (hasLeaveListener) {
      pointerObject.event._initFromTouch(e, touch, pointerEventTypes.leave, isPrimary, true);
      pointerEvent.target = pointerInfo.path[0];
      for (var j = 0; j < pointerInfo.path.length; j += 1) {
        dispatchEventOn(pointerEvent, pointerInfo.path[j]);
      }
    }

    delete pointersInfo[touch.identifier];
  }
  releasePointerObject(pointerObject);
}


module.exports = {
  start: start,
  move: move,
  end: end
};
