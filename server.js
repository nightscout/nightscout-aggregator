


var http = require('http')
  , ws = require('socket.io')
  , client = require('socket.io-client')
  , static = require('node-static')
  , es = require('event-stream')
  ;

var importer = require('./import');

function monitor (ep, dest) {
  var source = ep.endpoint;
  console.log(ep, source);
  var sock = client.connect(source, {'force new connection': true});
  sock.on('event', console.log.bind(console, 'EVENT'));
  sock.on('now', console.log.bind(console, 'now'));
  sock.on('dataUpdate', function (data) {
    console.log('ep', ep, 'got data', Object.keys(data));
    if (data.sgvs) {
    console.log('data', data.length, data.sgvs.slice(0, 4));
    // dest.sockets.in(ep.color).emit('sgv', data);
    // dest.sockets.in(ep.color).emit('pool', ep, data.sgvs);
    dest.sockets.emit('pool', ep, data.sgvs);
    } else {
      console.log("no sgvs", data);
    }
  });
  sock.on('connect', console.log.bind(console, 'connect'));
  sock.on('connect', function do_authorize (evt) {
    sock.emit('authorize', {
      client: 'web',
      secret: '',
      token: false
    }, function auth_callback (data) {
      console.log('auth callback', ep, data);
    });
  });
  sock.on('error', console.log.bind(console, 'error'));
  sock.on('disconnect', console.log.bind(console, 'disconnect'));
  return sock;
}

function createServer (opts) {
  var files = new static.Server('./static');
  var server = http.createServer(
        function (request, response) {
          request.addListener('end', function ( ) {
            files.serve(request, response);
          }).resume( );

        }
      );
  var io = ws.listen(server);
  var backends = { };
  io.sockets.on('connection', function (socket) {
    console.log("connected", arguments);
    socket.on('list', function (ep) {
      var list = [ ];
      Object.keys(backends).forEach(function (i) {
        var ep = backends[i];
        list.push(ep.ep);
      });
      console.log('listed', list);
      socket.emit('list', list);
    });
    socket.on('subscribe', function (ep) {
      if (!backends[ep.endpoint]) {
        do_subscribe(ep);
      }
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
    function do_subscribe (ep) {
        backends[ep.endpoint] = monitor(ep, io);
        backends[ep.endpoint].ep = ep;
    }
  // sources.forEach(function (src) { monitor(src, io); });
  var input = process.env.NIGHTSCOUTS || null;
  if (input) {
    importer(input).forEach(do_subscribe);
  }
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
