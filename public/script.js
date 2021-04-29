//HTML elements
let clientId = null;
let gameId = null;

let ws = new WebSocket("ws://localhost:4000"); 
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const txtgameId = document.getElementById("txtgameId");
const divPlayers = document.getElementById("divPlayers");

//Wiring events
joinBtn.addEventListener("click", e => {
    
    if (gameId === null)
        gameId = txtgameId.value;

    const payLoad = {
        "method": "join", 
        "clientId": clientId,
        "gameId": gameId,
    }

    ws.send(JSON.stringify(payLoad)); 
});

createBtn.addEventListener("click", e => {
    const payLoad = {
        "method": "create", 
        "clientId": clientId,
    }

    ws.send(JSON.stringify(payLoad)); 
}); 

ws.onmessage = message => { 
    //message.data
    const response = JSON.parse(message.data);
    //connect
    if (response.method === "connect") {
        clientId = response.clientId; 
        console.log("Client id set successful " + clientId);
    }

    if (response.method === "create") {
        gameId = response.game.id;
        console.log("Games successfully created with id " + gameId );
    }

    if (response.method === "join") {
        const game = response.game;

        while(divPlayers.firstChild)
            divPlayers.removeChild(divPlayers.firstChild); 

        game.clients.forEach(c => {
            const d = document.createElement("div");
            d.style.width = "200px"; 
            d.style.background = c.color; 
            d.textContent = c.clientId; 
            divPlayers.appendChild(d); 
        })
    }
}