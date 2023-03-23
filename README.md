# ELEC-E7320 - Internet-Protocols
Real-Time Whiteboard Application

The project has been a part of the course that accomplishes Real-Time Whiteboarding functionalities such as undo, erase, edit stickynotes, add stickynotes, edit stickynotes, and freehand drawing. Etc. 

The application runs on port 443. Before running the application, trust the certificates locally on your machine and ensure the path is right on the server. 

The project has been pushed to Docker, and below are the commands - 

Firstly, install node.js locally - https://nodejs.org/en/download

To Build:
docker build -t whiteboard . 

To run:
docker run -d -p 443:443 whiteboard   

To login:
docker exec -it <container id> /bin/bash

Initiating live logs for the server:
docker logs --follow container-id

To stop the docker container:
docker stop container-id

To kill the docker container:
docker kill container-id

How to run the project from VS Code? 

1. CD root folder of the project

2. NPM install

3. NPM start
