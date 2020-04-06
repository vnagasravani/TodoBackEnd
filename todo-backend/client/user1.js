const socket = io("http://localhost:3000");
const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RpZCI6ImEydVhYN2ZRIiwiaWF0IjoxNTgxMTQ2MDg3OTY1LCJleHAiOjE1ODEyMzI0ODcsInN1YiI6ImF1dGhUb2tlbiIsImlzcyI6ImVkQ2hhdCIsImRhdGEiOnsiZmlyc3ROYW1lIjoicmFnaGF2IiwibGFzdE5hbWUiOiJ2YW5rYWRhcmEiLCJlbWFpbCI6InZyQGdtYWlsLmNvbSIsIm1vYmlsZU51bWJlciI6Ijg2Mzk1NjM2MDEiLCJwYXNzd29yZCI6IlZtckAxMjM0IiwiY3JlYXRlZE9uIjoiMjAyMC0wMi0wOFQwNTo0OToxMi4xNTZaIiwiX2lkIjoiNWUzZTRiZDgxYmUzODYwNTY0NGNiMmUxIiwidXNlcklkIjoiOHNIMGZVSlciLCJfX3YiOjB9fQ.jGVWrhH4W5vnd6tnkUxIRi-pdvYTrMKaloubLbGzmug";
let msg ={
    senderid:"8sH0fUJW",
    receiverid:"s4LbAg7i",

    sendername:"user1",
    receivername:"user2"
}

let chat = () =>{
    $("#send").on('click', function () {

        let messageText = $("#messageToSend").val();
        msg.message = messageText;
        socket.emit("chat-msg",msg);
    
      });

      socket.on(msg.sendername , function(msg){
          console.log('you received a msg from '+ msg.sendername);
          console.log(msg.message);
      });

      socket.on("verify",function(data){
        console.log('verifying user');
        socket.emit("set-user",authToken);
    });

    socket.on(msg.senderid,function(data){
        console.log(data);
    });

    socket.on('online-user-list',function(data){
        console.log('some one joined or leave the room');
        console.log(data);
    });


}

chat();
