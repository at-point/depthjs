/*
DepthJS
Copyright (C) 2010 Aaron Zinman, Doug Fritz, Roy Shilkrot, and Greg Elliott

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


console.log('Starting DepthJS');
var DepthJS = {
  __VERSION__: '0.1',
  FRAME_WIDTH: 640,
  FRAME_HEIGHT: 480,
  
  verbose: true,
  backend: {},
  eventHandlers: {},
  cv: {},
  tools: {},
  eventListeners: [],
  eventLink: [],
  test: {}
};

console.log('Making loader');

var WS_CONNECTING = 0;
var WS_OPEN = 1;
var WS_CLOSING = 2;
var WS_CLOSED = 3;

DepthJS.init = function () {
  if (DepthJS.verbose) console.log("Connecting WebSocket");
  if (!DepthJS.backend.connect()) {
    if (DepthJS.verbose) console.log("Couldn't connect... aborting");
    return;
  }
}

DepthJS.tools.obj_repr = function (obj, className) {
  var buf = [];
  if (className === undefined) {
    buf.push('[Object ');
  } else {
    buf.push('[' + className + ' ');
  }
  for (var key in obj) {
    buf.push(key + '=' + obj[key]);
    buf.push(', ');
  }
  buf.pop();
  buf.push(']');
  return buf.join('');
};

DepthJS.backend.eventWs = null;
DepthJS.backend.imageWs = null;
DepthJS.backend.depthWs = null;
DepthJS.backend.host = "localhost";
DepthJS.backend.port = 8000;
DepthJS.backend.connecting = false;
DepthJS.backend.connected = false;

DepthJS.backend.connect = function() {
  DepthJS.backend.connecting = true;
  var connected = 0;
  function check() {
    connected++;
    if (connected == 1) {
      if (DepthJS.verbose) console.log("Connected to event stream");
      DepthJS.backend.connecting = false;
      DepthJS.backend.connected = true;
    }
  }

  // If we do not connect within a timeout period,
  // effectively cancel it and let the popup know.
  setTimeout(function() {
    if (connected != 1) {
      DepthJS.backend.disconnect();
    }
  }, 3000);

  return _.all(_.map(["event"], function(stream) {
    var path = "ws://" + DepthJS.backend.host + ":" + DepthJS.backend.port + "/" + stream;
    if (DepthJS.verbose) console.log("Connecting to " + stream + " stream on " + path);

    // Clear out any old sockets
    var oldSocket = DepthJS.backend[stream+"Ws"];
    if (oldSocket != null) {
      oldSocket.onmessage = null;
      oldSocket.onclose = null;
      oldSocket.onopen = null;

      if (oldSocket.readyState == WS_OPEN ||
          oldSocket.readyState == WS_CONNECTING) {
        oldSocket.close();
      }
    }

    var socket = new WebSocket(path);
    DepthJS.backend[stream+"Ws"] = socket;

    socket.onmessage = function(data){
      DepthJS.backend.onMessage(stream, data);
    };

    socket.onclose = function() {
      DepthJS.backend.onDisconnect(stream);
    };

    socket.onopen = function() {
      DepthJS.backend.onConnect(stream);
      check();
    };

    return true;
  }));
};

DepthJS.backend.onMessage = function (stream, data) {
  if (stream == "event") {
    if (data === undefined || data.data == null) {
      return;
    }
    // if (DepthJS.verbose) console.log(data.data);
    var msg = JSON.parse(data.data);
    var handler = DepthJS.eventHandlers["on"+msg.type];
    if (handler != null) {
      handler(msg.data);
    }

    msg.jsonRep = data.data;
  } else if (stream == "image") {
    DepthJS.eventHandlers.onImageMsg(data);
  } else if (stream == "depth") {
    DepthJS.eventHandlers.onDepthMsg(data);
  }
};

DepthJS.backend.disconnect = function() {
  DepthJS.backend.connected = false;
  if (DepthJS.verbose) console.log("Disconnecting");
  return _.map(["event"], function(stream) {
    var oldSocket = DepthJS.backend[stream+"Ws"];
    if (oldSocket != null) {
      oldSocket.onmessage = null;
      oldSocket.onclose = null;
      oldSocket.onopen = null;

      if (oldSocket.readyState == WS_OPEN ||
          oldSocket.readyState == WS_CONNECTING) {
        oldSocket.close();
      }
    }
    DepthJS.backend[stream+"Ws"] = null;
  });
}

DepthJS.backend.onDisconnect = function (stream) {
  if (DepthJS.verbose) console.log("Disconnected on " + stream + " stream");
  // If one is closed, close them all.
  DepthJS.backend.disconnect();
};

DepthJS.backend.onConnect = function (stream) {
  if (DepthJS.verbose) console.log("Connect on " + stream + " stream");
};


console.log('Defined DepthJS... launching init');
DepthJS.init();
