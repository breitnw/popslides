const express = require('express');
const app = express();
const http = require('http');
const fs = require('fs');


const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server);

allPresentations = {};

class User {
   name;
   points;
   constructor (name, points) {
      this.name = name;
      this.points = points;
   }
}

class Presentation {

   quizzes;
   joinCode;
   state = 'start';
   currentPage;
   numPages;
   users = {}; // socketId : User

   constructor() {
      //Generate random code not in use
      this.joinCode = this.generateCode();
      this.currentPage = 1;
      this.quizzes = JSON.parse(fs.readFileSync(__dirname+"/client/public/quiz.json"));

      console.log("Created presentation code:" +this.joinCode);

      //Add to dictionary
      allPresentations[this.joinCode] = this;
   }

   addUser(socket, name) {
      //Add user to dictionary:
      this.users[socket.id] = new User(name, 0);
      socket.join(this.joinCode);//Add user to room
      io.of('/host').in(this.joinCode).emit('presentation', allPresentations[this.joinCode]);//Send presentation status to everyone

      console.log("user: "+name+" joined presentation: " + this.joinCode);
   }

   generateCode() {
      let joinCode = ""
      do {
         joinCode = ""
         for (var i = 0; i < 6; i++) {
            joinCode += Math.floor(Math.random() * 10);
         }
      } while (allPresentations[this.joinCode])
      return joinCode;
   }

   updateAll() {
      io.of("/user").in(this.joinCode).emit('presentation', this);
      io.of("/host").in(this.joinCode).emit('presentation', this, this.quizzes[this.currentPage]);
   }

   setPoints(id, pts){
      this.users[id].points = pts;
      io.of("/host").in(this.joinCode).emit('presentation', this, this.quizzes[this.currentPage]);
   }

   goDie(){
      io.of("/user").in(this.joinCode).disconnectSockets();
      io.of("/host").in(this.joinCode).disconnectSockets();
      delete this;
   }

}



//Serve the home screen
app.get('/', (req, res) => {
   res.sendFile(__dirname + '/client/home.html');
});


// HOSTING ---------------------------------------------------

//Serve the host screen
app.get('/host', (req, res) => {
   res.sendFile(__dirname+'/client/host/host.html');
   app.use('/host', express.static(__dirname+'/client/host'));
});

//host namespace
const hostNsp = io.of("/host");
hostNsp.on('connect', (socket) => {
   console.log("host joined: "+socket.id);
   const code = new Presentation().joinCode; //Make new Presentation (&add to dictionary)
   socket.join(code); //Join the host to the room code
   console.log(allPresentations[code]);
   socket.emit('presentation', allPresentations[code]); //Sends presentation object back to client


   socket.on('pdfData', (n) => {allPresentations[code].numPages = n; });
   socket.on('setState', (state) => {
      allPresentations[code].state = state;
      allPresentations[code].updateAll();
   });


   socket.on('changePage', (num) => {
      allPresentations[code].currentPage += num;
      allPresentations[code].updateAll();
   });

   socket.on('disconnect', () => {
      console.log("deleted presentation: "+code);
      allPresentations[code].goDie();
   });
});




// USER ---------------------------------------------------
app.get('/user', (req, res) => {
   res.sendFile(__dirname+'/client/user/user.html');
   app.use('/user', express.static(__dirname+'/client/user'));
});

//user namespace
const userNsp = io.of("/user");
userNsp.on('connect', (socket) => {
   console.log("student joined: " + socket.id)
   let presentationCode;
   
   socket.on('join', (name, code, callback) => {
      if(allPresentations[code]){
         //GOOD TO GO! ENTERED CORRECT CODE

         allPresentations[code].addUser(socket, name);
         socket.on('disconnect', () => {
            //console.log("User left: "+ allPresentations[code].users[socket.id].name);
            delete allPresentations[code].users[socket.id];
         });

         socket.on('quizData', (pts) => {
            allPresentations[code].setPoints(socket.id, pts);
         });


         callback({ status: "ok"});
      } else {
         callback({ status: "error" });
      }
   });



});
app.use(express.static(__dirname+'/client/public'));

server.listen(8080, () => {
   console.log('Port 8080');
});