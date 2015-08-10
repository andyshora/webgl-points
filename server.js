var express = require('express');
var app = express();

var server = app.listen(process.env.PORT || 3000, function() {
  console.log('Listening on port %d', server.address().port);
});

var io = require('socket.io')(server);

io.on('connection', function (socket) {
  console.log('new client listening');

  socket.on('world:created', function(data){
    console.log('world:created', data);
  });

  socket.on('disconnect', function(){
    console.log('client disconnected');
  });

  // test functions
  socket.on('world:test:add-points', function(data) {
    sendTestPoints(socket, data.n, data.size);
  });
});

function sendTestPoints(socket, n, size) {
  console.log('sendTestPoints', n, size);

  for (var i = 0; i < n; i++) {
    socket.emit('world:points:add', { x: Math.random() * size - (size / 2), y: Math.random() * size - (size / 2), z: Math.random() * size - (size / 2), payload: null });
  }
}

// serve static files
app.use(express.static(__dirname + '/static'));
