let canvas = document.getElementById('canvas');
canvas.width = 0.98 * window.innerWidth;
canvas.height = window.innerHeight;

var io = io.connect('https://localhost:443');

let ctx = canvas.getContext('2d');

let x;
let y;
let mouseDown = false;
let imgX = 0;
let imgY = 0;


let currentTool = 'pen';

function selectTool(tool) {
  currentTool = tool;
}


let canvasCommands = [];
let canvasCommandsStack = [];
let undoButton = document.getElementById('undoButton');
undoButton.disabled = true;

let addNoteButton = document.getElementById('addNoteButton');
let noteInput = document.getElementById('noteInput');


io.on('sendCanvasCommands', (commands) => {
  commands.forEach((command) => {
    switch (command.type) {
      case 'beginPath':
      case 'moveTo':
      case 'lineTo':
        drawOnCanvas(command);
        canvasCommands.push(command);
        break;
      case 'stickyNote':
        drawOnCanvas(command);
        break;
      case 'deleteStickyNote':
        deleteStickyNote({ x: x, y: y, content: content });
        break;
    }
  });
});


function drawOnCanvas(data) {
  switch (data.type) {
    case 'beginPath':
      ctx.beginPath();
      break;
    case 'moveTo':
      ctx.moveTo(data.x, data.y);
      break;
    case 'lineTo':
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
      break;
    case 'stickyNote':
      drawStickyNote(data.x, data.y, data.content, data.id);
      break;
    case 'deleteStickyNote':
      deleteStickyNote({ x: x, y: y, content: content });
      break;
    case 'image':
      let img = document.createElement('img');
      img.onload = function() {
        ctx.drawImage(img, imgX, imgY);
        if (data.text) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillRect(data.text.x, data.text.y, data.text.width, data.text.height);
          ctx.fillStyle = 'black';
          ctx.font = '20px Arial';
          ctx.fillText(data.text.content, data.text.x + 10, data.text.y + 30);
        }
      };
      img.src = data.dataURL;
      ctx.drawImage(img, imgX, imgY);

      break;
  }
}


let isDragging = false;
let offsetX = 0;
let offsetY = 0;

canvas.addEventListener('mousedown', (e) => {
  let rect = canvas.getBoundingClientRect();
  let mouseX = e.clientX - rect.left;
  let mouseY = e.clientY - rect.top;

  if (mouseX > imgX && mouseX < imgX + canvas.width &&
    mouseY > imgY && mouseY < imgY + canvas.height) {
  isDragging = true;
  offsetX = mouseX - imgX;
  offsetY = mouseY - imgY;
}

});

canvas.addEventListener('mousemove', (e) => {
  if (isDragging) {
    imgX = e.clientX - canvas.offsetLeft - offsetX;
    imgY = e.clientY - canvas.offsetTop - offsetY;
    redrawCanvas();
  } else if (mouseDown && e.target === canvas) {
    let newX = e.clientX;
    let newY = e.clientY;
    if (currentTool === 'pen') {
      ctx.lineTo(newX, newY);
      ctx.stroke();
      io.emit('draw', { type: 'lineTo', x: newX, y: newY });
      x = newX;
      y = newY;
    } else if (currentTool === 'eraser') {
      ctx.clearRect(newX - 5, newY - 25, 30, 30);
      io.emit('erase', { x: newX, y: newY });
    }
  }
});




canvas.addEventListener('mouseup', (e) => {
  isDragging = false;
});

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvasCommands.forEach((command) => {
    drawOnCanvas(command);
  });
}



canvas.addEventListener('mousedown', (e) => {
  x = e.clientX;
  y = e.clientY;
  ctx.beginPath();
  ctx.moveTo(x, y);
  mouseDown = true;
  if (currentTool === 'pen') {
    io.emit('draw', { type: 'beginPath' });
    io.emit('draw', { type: 'moveTo', x, y });
  }
});



canvas.addEventListener('mouseup', (e) => {
  mouseDown = false;
});

canvas.addEventListener('mousemove', (e) => {
  if (mouseDown) {
    let newX = e.clientX;
    let newY = e.clientY;
    if (currentTool === 'pen') {
      ctx.lineTo(newX, newY);
      ctx.stroke();
      io.emit('draw', { type: 'lineTo', x: newX, y: newY });
      x = newX;
      y = newY;
    } else if (currentTool === 'eraser') {
      ctx.clearRect(newX - 5, newY - 5, 10, 10);
      io.emit('erase', { x: newX, y: newY });
    }
  }
});


undoButton.addEventListener('click', () => {
  if (canvasCommands.length > 0) {
    let lastCommand = canvasCommands.pop();
    canvasCommandsStack.push(lastCommand);
    redrawCanvas();
    if (canvasCommands.length === 0) {
      undoButton.disabled = true;
    }
    io.emit('undo', lastCommand);
  }
});

addNoteButton.addEventListener('click', () => {
  let noteContent = noteInput.value.trim();
  if (noteContent !== '') {
    let x = Math.floor(Math.random() * (canvas.width - 100));
    let y = Math.floor(Math.random() * (canvas.height - 100));
    createStickyNoteElement(noteContent, x, y);
    noteInput.value = '';
  }
});

function drawStickyNote(x, y, content) {
  const noteWidth = 200;
  const noteHeight = 100;
  const notePadding = 10;
  const noteColor = "#FFFFCC";
  const noteStrokeColor = "#666666";
  const noteTextColor = "#000000";
  const closeIconSize = 20;

  ctx.fillStyle = noteColor;
  ctx.strokeStyle = noteStrokeColor;
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, noteWidth, noteHeight);
  ctx.strokeRect(x, y, noteWidth, noteHeight);

  ctx.fillStyle = noteTextColor;
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText(content, x + noteWidth/2, y + noteHeight/2);

 
  ctx.fillStyle = "#FF0000";
  ctx.fillRect(x + noteWidth - closeIconSize, y, closeIconSize, closeIconSize);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("X", x + noteWidth - closeIconSize/2, y + closeIconSize/2);

  canvas.addEventListener('click', (e) => {
    let rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    if (mouseX >= x + noteWidth - closeIconSize && mouseX <= x + noteWidth &&
        mouseY >= y && mouseY <= y + closeIconSize) {
      deleteStickyNote({ x: x, y: y, content: content });
    }
  });
}

io.on('ondraw', (data) => {
  drawOnCanvas(data);
  canvasCommands.push(data);
  undoButton.disabled = false;
});

io.on('onundo', (data) => {
  canvasCommands.pop();
  canvasCommandsStack.push(data);
  redrawCanvas();
  if (canvasCommands.length === 0) {
    undoButton.disabled = true;
  }
});

io.on('stickyNote', (note) => {
 
  canvasCommands.push({ type: 'stickyNote', ...note });
  redrawCanvas();
});

io.on('deleteStickyNote', (note) => {
  deleteStickyNote(note);
  redrawCanvas();
});

function createStickyNoteElement(content, x, y) {
  let noteElement = document.createElement('div');
  noteElement.classList.add('sticky-note');
  noteElement.textContent = content;
  noteElement.style.left = `${x}px`;
  noteElement.style.top = `${y}px`;
  canvas.appendChild(noteElement);

  let note = { 
    x: parseInt(noteElement.style.left), 
    y: parseInt(noteElement.style.top), 
    content: content 
  };

  const id = Date.now().toString(); 
  canvasCommands.push({ type: 'stickyNote', id, x, y, content });
  redrawCanvas();
  io.emit('stickyNote', { id, x, y, content });
}

function deleteStickyNote(note) {

  let index = -1;
  for (let i = 0; i < canvasCommands.length; i++) {
    if (canvasCommands[i].type === 'stickyNote' &&
        canvasCommands[i].x === note.x &&
        canvasCommands[i].y === note.y &&
        canvasCommands[i].content === note.content) {
      index = i;
      break;
    }
  }

  if (index !== -1) {

    canvasCommands.splice(index, 1);
    redrawCanvas();

    
    io.emit('deleteStickyNote', note);
    console.log('deleteStickyNote', note )
  }
}

canvas.addEventListener('click', (e) => {
  let rect = canvas.getBoundingClientRect();
  let mouseX = e.clientX - rect.left;
  let mouseY = e.clientY - rect.top;

  for (let i = canvasCommands.length - 1; i >= 0; i--) {
    let command = canvasCommands[i];
    if (command.type === 'stickyNote') {
      let noteX = command.x;
      let noteY = command.y;
      let noteWidth = 80;
      let noteHeight = 70;

      if (mouseX >= noteX && mouseX <= noteX + noteWidth &&
          mouseY >= noteY && mouseY <= noteY + noteHeight) {

        let newContent = prompt('Edit Your Sticky Note:', command.content);
        if (newContent === null || newContent.trim() === '') {
          return;
        }

        command.content = newContent;
        redrawCanvas();
        io.emit('draw', command);
        break; 
      }
    }
  }
});

document.getElementById("save-btn").addEventListener("click", saveCanvas);
function saveCanvas() {
  const image = canvas.toDataURL("Whiteboard/png"); // or "Whiteboard/jpeg"
  const link = document.createElement("a");
  link.download = "Whiteboard.png"; // or "Whiteboard.jpg"
  link.href = image;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

let imageUpload = document.getElementById('imageUpload');

imageUpload.addEventListener('change', (e) => {
  let file = e.target.files[0];
  let reader = new FileReader();

  reader.onload = function(event) {
    let img = new Image();
    img.onload = function() {

      const desiredWidth = 500;
      const desiredHeight = 500;
      let scale = Math.min(desiredWidth / img.width, desiredHeight / img.height);
      let width = img.width * scale;
      let height = img.height * scale;
      let x = (canvas.width - width) / 2;
      let y = (canvas.height - height) / 2;
      ctx.drawImage(img, imgX, imgY, width, height);
      let textX = x + 10;
      let textY = y + 10;
      let textWidth = width - 20;
      let textHeight = 50;
      let textContent = ''; 
  
      let textBox = document.createElement('textarea');
      textBox.style.position = 'absolute';
      textBox.style.left = textX + 'px';
      textBox.style.top = textY + 'px';
      textBox.style.width = textWidth + 'px';
      textBox.style.height = textHeight + 'px';
      textBox.style.border = '2px solid black';
      textBox.style.padding = '5px';
      textBox.style.fontSize = '16px';
      textBox.style.fontFamily = 'Arial';
      textBox.addEventListener('input', (e) => {
        textContent = e.target.value; 
      });
      document.body.appendChild(textBox);
      textBox.focus(); 
      let dataURL = canvas.toDataURL();
      let data = { type: 'image', dataURL: dataURL, text: { x: textX, y: textY, width: textWidth, height: textHeight, content: textContent } };
      io.emit('draw', data);
      canvasCommands.push(data);
      
      undoButton.disabled = false;
    };
    img.src = event.target.result;
  };  
  reader.readAsDataURL(file);
});





