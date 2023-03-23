let express = require('express');
let app = express();
const fs = require('fs');
const https = require('https');

let host = null;
let users = [];

let canvasCommands = [];        
let canvasCommandsStack = [];  
let noteID = 0;

let privateKey = fs.readFileSync('cert/cert.key');
let certificate = fs.readFileSync('cert/cert.crt');

let httpsServer = https.createServer({key: privateKey, cert: certificate}, app);

let io = require('socket.io')(httpsServer);

io.on('connection', (socket) => {
  if (host === null) {
    host = socket;
    console.log(`Host connected with id ${socket.id}`);
    socket.emit('sendCanvasCommands', canvasCommands);
  } else {
    users.push(socket);
    console.log(`User connected with id ${socket.id}`);
    socket.emit('sendCanvasCommands', canvasCommands);
    host.emit('sendNewUserCanvasCommands', canvasCommands);
  }

  socket.on('erase', (data) => {
    canvasCommandsStack.push(data);
    canvasCommands.push(data);
    users.forEach((user) => {
      user.emit('erase', data);
    });
    host.emit('erase', data);
    console.log('erase', data);
  });
  

  socket.on('draw', (data) => {
    canvasCommandsStack.push(data);
    canvasCommands.push(data);
    users.forEach((user) => {
      user.emit('ondraw', data);
    });
    host.emit('ondraw', data);
    console.log('draw', data);
  });

  socket.on('stickyNote', (data) => {
    data.id = `note${noteID++}`;
    canvasCommands.push(data);
    users.forEach((user) => {
      user.emit('stickyNote', data);
    });
    host.emit('stickyNote', data);
    console.log('stickyNote', data);
  });

  socket.on('deleteStickyNote', (data) => {
    canvasCommands.push(data);
    users.forEach((user) => {
      user.emit('deleteStickyNote', data);
    });
    host.emit('deleteStickyNote', data);
    console.log('deleteStickyNote', data);
  });
  
  socket.on('undo', () => {           
    if (canvasCommandsStack.length > 0) {  
      let lastCommand = canvasCommandsStack.pop(); 
      canvasCommands.pop();             
      users.forEach((user) => {
        user.emit('onundo', lastCommand);    
      });
      host.emit('onundo', lastCommand);
    }
  });

  socket.on('imageUpload', (dataURL) => {
    canvasCommands.push({ type: 'image', dataURL });
    users.forEach((user) => {
      user.emit('imageUpload', dataURL);
    });
    host.emit('imageUpload', dataURL);
    console.log('imageUpload', dataURL);
  });
  
  socket.on('disconnect', (reason) => {
    if (socket === host) {
      console.log(`Host ${socket.id} disconnected. All the users will get disconnected.`);
      users.forEach((user) => {
        user.disconnect();
      });
      users = [];
      host = null;
      canvasCommands = [];
      canvasCommandsStack = [];
    } else {
      users = users.filter(user => user !== socket);
      console.log(`User ${socket.id} disconnected.`);
    }
  });
});

app.use(express.static('public'));

let PORT = process.env.PORT || 443;

httpsServer.listen(PORT, () => console.log('Server started on port ' + PORT));
