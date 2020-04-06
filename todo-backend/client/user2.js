socket = io("http://localhost:3000");
const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RpZCI6IlM4eE5HdjVDIiwiaWF0IjoxNTgxMTM5NzkxODY4LCJleHAiOjE1ODEyMjYxOTEsInN1YiI6ImF1dGhUb2tlbiIsImlzcyI6ImVkQ2hhdCIsImRhdGEiOnsiZmlyc3ROYW1lIjoic3JhdmFuaSIsImxhc3ROYW1lIjoidmFua2FkYXJhIiwiZW1haWwiOiJ2bmFnQGdtYWlsLmNvbSIsIm1vYmlsZU51bWJlciI6IjkxMzMwODMyNDkiLCJwYXNzd29yZCI6IlJhZzIxODk4JCQiLCJjcmVhdGVkT24iOiIyMDIwLTAyLTA2VDA4OjI5OjM5LjM2OVoiLCJfaWQiOiI1ZTNiY2U3M2ZiYzBlMTFhMjhhMmNhOGMiLCJ1c2VySWQiOiJzNExiQWc3aSIsIl9fdiI6MH19.cMsMfrPA3QVkiM3TYF5o0XMYqWxVysvFZzbz-G1UdxA"
let msg ={
    receiverid:"8sH0fUJW",
    senderid:"s4LbAg7i",

    receivername:"user1",
    sendername:"user2"
}
let chat = () =>{
    $("#send").on('click', function () {

        let messageText = $("#messageToSend").val()
        msg.message = messageText;
        socket.emit("chat-msg",msg);
    
      });

      socket.on(msg.sendername, function(msg){
          console.log('you received a msg from '+ msg.sendername );
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
   })

}

chat();
