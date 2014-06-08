


var http = require('http')
  , ecstatic = require('ecstatic')
  , ws = require('socket.io')
  , client = require('socket.io-client')
  , es = require('event-stream')
  ;

function monitor (ep, dest) {
  var source = ep.endpoint;
  console.log(ep, source);
  var sock = client.connect(source, {'force new connection': true });
  sock.on('event', console.log.bind(console, 'EVENT'));
  sock.on('now', console.log.bind(console, 'now'));
  sock.on('sgv', function (data) {
    console.log('ep', ep, 'got data', data.length);
    // dest.sockets.in(ep.color).emit('sgv', data);
    dest.sockets.in(ep.color).emit('pool', ep, data);
  });
  sock.on('connect', console.log.bind(console, 'connect'));
  sock.on('error', console.log.bind(console, 'error'));
  sock.on('disconnect', console.log.bind(console, 'disconnect'));
  return sock;
}

function createServer (opts) {
  var server = http.createServer(
        ecstatic({
          root: __dirname + '/static/'
        , autoIndex: true
        // , showDir: false
        })
      );
  var io = ws.listen(server);
  var backends = { };
  io.sockets.on('connection', function (socket) {
    console.log("connected", arguments);
    socket.on('subscribe', function (ep) {
      // backends.push(ep);
      backends[ep.endpoint] = monitor(ep, io);
      // ep.backend =
      socket.join(ep.color);
      console.log("subscribed", arguments);
    });
    socket.on('unsubscribe', function (ep) {
      console.log('leaving', arguments, ep.color);
      socket.leave(ep.color);
      if (ep.endpoint in backends) {
        console.log('backend', backends[ep.endpoint]);
        backends[ep.endpoint].socket.disconnect( );
        // backends[ep.endpoint].close( );
        delete backends[ep.endpoint];
      }
      // backends.forEach(function (item) { });
    });
  });
  // sources.forEach(function (src) { monitor(src, io); });
  return server;

}

var sources = [
    'ws://nightscouthd.azurewebsites.net/'
  , 'ws://localhost:8181/'
  , 'http://ba-cgm.azurewebsites.net/'
];

if (!module.parent) {
  var port = process.env.PORT || 9090;
  var server = createServer({ }).listen(port);
  console.log('listening on http://localhost:%s', port);
}
