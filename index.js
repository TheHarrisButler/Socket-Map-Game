const http = require("http");
const app = require("express")();
const fetch = require("node-fetch");

app.get("/", (req,res) => res.sendFile(__dirname + "/public/index.html"))
app.listen(4001, () => console.log("Listening on http port 4001")); 

const websocketServer = require("websocket").server; 
const httpServer = http.createServer(); 
httpServer.listen(4000, () => console.log("Listening on port 4000")); 

const clients = {};
const games = {};
let correctState = null;

const wsServer = new websocketServer({
    "httpServer": httpServer
});

wsServer.on("request", request => {
    //connect
    const connection = request.accept(null, request.origin);
    connection.on('open', () => console.log('opened!')); 
    connection.on('close', () => console.log('closed!')); 
    connection.on('message', message => {
        
        const result = JSON.parse(message.utf8Data);
        
        //Server has recieved a 
        
        //user create a new game
        if (result.method === "create") {

            const clientId = result.clientId; 
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "clients": [], 
            }

            const payLoad = {
                "method": "create", 
                "game": games[gameId], 
            }
    
            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }
        
        //A client wants to join the game
        if (result.method === "join") {
            
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];

            
            if  (game.clients.length >= 2) {
                //sorry max players reached
                return;
            }

            const color = {"0": "Green", "1": "Red"}[game.clients.length];
            
            game.clients.push({
                "clientId": clientId,
                "color": color, 
                "score": 0
            })

            const payLoad = {
                "method": "join", 
                "game": game
            }

            //loop through all clients and tell them people have joined
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad)); 
            })
        }

        if (result.method === "set") {

            const gameId = result.gameId;
            const game = games[gameId];
            const street = result.street;
            const city = result.city;
            const state = result.state;
            

            correctState = state;
            const newStreet = street.split(' ').join('+');
            const newCity = city.split(' ').join('+');
            const url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + newStreet + ',' + newCity + ',' + state + '&key=AIzaSyA0f-uBcsgu1PQh0i6wdxe3FDSsgUo63_k'; 
            //TODO: Figure out game state in terms of score and such

            //autheticate adress with ship engine

            //Send a request to geocode api
            fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + newStreet + ',' + newCity + ',' + state + '&key=AIzaSyA0f-uBcsgu1PQh0i6wdxe3FDSsgUo63_k')
                .then(res => res.json())
                .then(json => {
                    let lat = json.results[0].geometry.location.lat;
                    let lng = json.results[0].geometry.location.lng;

                                //Send longitude and latitude back to client
                    const payLoad = {
                        "method": "set",
                        "lat": lat,
                        "lng": lng,
                        "game": game
                    }
                    console.log(lat);
                    
                    game.clients.forEach(c => {
                        clients[c.clientId].connection.send(JSON.stringify(payLoad)); 
                    })
                });
        }

    })

    //generate a new clientID
    const clientId = guid();

    clients[clientId] = {
        "connection": connection,
    }

    const payload = {
        "method": 'connect', 
        "clientId": clientId
    }

    connection.send(JSON.stringify(payload));

}); 

//guid maker
function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}
 
// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();