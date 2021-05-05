let clientId = null;
let gameId = null;
let lat = null;
let lng = null;
let myTurn = true;

let ws = new WebSocket("ws://localhost:4000"); 
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const txtgameId = document.getElementById("txtgameId");
const divPlayers = document.getElementById("divPlayers");
const divAlert = document.getElementById("divAlert");
const streetInput = document.getElementById("streetInput");
const cityInput = document.getElementById("cityInput");
const stateInput = document.getElementById("stateInput");
const addressBtn = document.getElementById("addressBtn");
const guessInput = document.getElementById("guessInput"); 
const guessBtn = document.getElementById("guessBtn");

function initialize() {
    panorama = new google.maps.StreetViewPanorama(
        document.getElementById("street-view"),
        {
        position: { lat: lat, lng: lng },
        disableDefaultUI: true,
        pov: { heading: 165, pitch: 0 },
        zoom: 1,
        }
    );
}

function alert(n) {
    $.bootstrapGrowl(n, {
        type: "danger",
        offset: {from: "top", amount:40}, 
        align: "center", 
        delay: 3000,
        allow_dismiss: false,
        stackup_spacing: 10
    });
}

function successAlert(n) {
    $.bootstrapGrowl(n, {
        type: "success",
        offset: {from: "top", amount:40}, 
        align: "center", 
        delay: 3000,
        allow_dismiss: false,
        stackup_spacing: 10
    });
}

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
    myTurn = false;
    const payLoad = {
        "method": "create", 
        "clientId": clientId,
    }

    ws.send(JSON.stringify(payLoad)); 
});

addressBtn.addEventListener("click", e => {
    if (gameId === null) {
        alert("Game has not been created");
    }
    else if (myTurn === true) {
        alert("It is not your turn to submit an address!"); 
    }
    else{
        const payLoad = {
        "method": "set",
        "gameId": gameId, 
        "clientId": clientId,
        "street": streetInput.value,
        "city": cityInput.value, 
        "state": stateInput.value, 
        }

        ws.send(JSON.stringify(payLoad));
    }
});

guessBtn.addEventListener("click", e => {
    if (gameId === null) {
        alert("Game has not been created");
    }
    else if (myTurn === false) {
        alert("It is not your turn to guess...please submit an address"); 
    }
    else{
        const payLoad = {
            "method" : "guess",
            "gameId": gameId, 
            "clientId": clientId, 
            "guess": guessInput.value
        }

        ws.send(JSON.stringify(payLoad));
    }
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
        successAlert("Games successfully created!"); 
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
            d.textContent = c.name + " " + c.score; 
            divPlayers.appendChild(d); 
        })

        successAlert("A player has joined the lobby");
    }

    if (response.method === "set") {
        lat = response.lat; 
        lng = response.lng; 

        initialize();
    }

    if (response.method === "guess"){
        const message = response.message;
        const game = response.game;

        while(divPlayers.firstChild)
            divPlayers.removeChild(divPlayers.firstChild); 

        game.clients.forEach(c => {
            const d = document.createElement("div");
            const p = document.createElement("p")
            d.style.width = "200px"; 
            d.style.background = c.color; 
            d.textContent = c.name + " " + c.score; 
            divPlayers.appendChild(d);
        });

        if (message === "Correct!") {
            successAlert("Player answered correctly"); 
        }else if (message == "Winner!"){
            successAlert("Player Wins!!"); 
        } else {
            alert("Player was incorect."); 
        }
        
        if (myTurn === false) {
            myTurn = true; 
        }
        else{
            myTurn = false;
        }
    }
}