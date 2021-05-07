const http = require("http");
const express = require("express");
const fetch = require("node-fetch");
global.Headers = fetch.Headers;

//port number and routes
let PORT = process.env.PORT;
const index = require('./routes/index'); 
const instructions = require("./routes/instructions");

//express server
const app = express();

//define routes for express server
app.use('/', index)
app.use('/instructions', instructions); 
app.use(express.static('public'));

//PORTS for express server
if (PORT == null || PORT == "") {
    PORT = 4001;
}

//Websocket Server
const websocketServer = require("websocket").server; 
const httpServer = http.createServer(app); 

const wsServer = new websocketServer({
    "httpServer": httpServer
});

httpServer.listen(4001, () => console.log(`Listening on...${PORT}`));

//Some state variables
const clients = {};
const games = {};
let correctState = null;
const states = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AS": "American Samoa",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District Of Columbia",
    "FM": "Federated States Of Micronesia",
    "FL": "Florida",
    "GA": "Georgia",
    "GU": "Guam",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MH": "Marshall Islands",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "MP": "Northern Mariana Islands",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PW": "Palau",
    "PA": "Pennsylvania",
    "PR": "Puerto Rico",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VI": "Virgin Islands",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
}

//start websocket server
wsServer.on("request", request => {
    //connect
    const connection = request.accept(null, request.origin);
    connection.on('open', () => console.log('opened!')); 
    connection.on('close', () => console.log('closed!'));

    connection.on('message', message => {
        
        const result = JSON.parse(message.utf8Data);
        
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
                "name": "Player " + color,
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

            //address variables
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            const street = result.street;
            const city = result.city;
            const state = result.state;

            //Ship Engine Variables
            let headers = new Headers();
            let options = {};
            
            //geocode variables
            correctState = state;
            const newStreet = street.split(' ').join('+');
            const newCity = city.split(' ').join('+');

            //autheticate address with ship engine
            headers.append("Host", "api.shipengine.com");
            headers.append("API-Key", "TEST_Nk+KKTCqZX53RxFzFXxfCijIrp7X+7GaClGoQQGGG1A");
            headers.append("Content-Type", "application/json");

            let raw = JSON.stringify([{"address_line1":street,"city_locality":city,"state_province":state,"country_code":"US"}]);

            options = {
                method: 'POST',
                headers: headers,
                body: raw,
                redirect: 'follow'
            }; 

            fetch("https://api.shipengine.com/v1/addresses/validate", options)
                .then(response => response.json())
                .then(json => {
                    console.log(json[0]);
                    let status = json[0].status;

                    console.log(status); 
                    if (status === "verified")  {

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
                            
                            game.clients.forEach(c => {
                                if(c.clientId != clientId) {
                                    clients[c.clientId].connection.send(JSON.stringify(payLoad)); 
                                }
                            })
                        });
                    } else {
                        //invalid address
                        const payLoad = {
                            "method": "failed",
                            "message": "Invalid Address"
                        }
        
                        game.clients.forEach(c => {
                            if(c.clientId === clientId) {
                                clients[c.clientId].connection.send(JSON.stringify(payLoad)); 
                            }
                        })
                    }
                })
                .catch(error => {
                    console.log(error); 
                    
                    //Geocode Error
                    const payLoad = {
                        "method": "failed",
                        "message": "Invalid Address"
                    }
    
                    game.clients.forEach(c => {
                        if(c.clientId === clientId) {
                            clients[c.clientId].connection.send(JSON.stringify(payLoad)); 
                        }
                    })
                });
        }

        if (result.method === "guess") {
            //client A to have the ability to guess and client B only have the ability to send a address.
            const clientId = result.clientId; 
            const gameId = result.gameId;
            const game = games[gameId]; 
            const guess = result.guess;

            let payLoad = {};

            if (guess === correctState) {
                game.clients.forEach(c => {
                    if(c.clientId === clientId) {
                        c.score += 1;
                        if(c.score >= 3) {
                            payLoad = {
                                "method":"guess",
                                "message": "Winner!", 
                                "game": game,
                                "state": states[correctState] 
                            }
                        } else {
                            payLoad = {
                                "method":"guess",
                                "message": "Correct!", 
                                "game": game, 
                                "state": states[correctState]                            }
                        }
                    }
                })
            } else {
                payLoad = {
                    "method":"guess",
                    "message": "Incorrect.", 
                    "game": game,
                    "state": states[correctState]
                }
            }

            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad)); 
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