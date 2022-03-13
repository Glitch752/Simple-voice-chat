var { WebSocketServer } = require("ws");

var wss = new WebSocketServer({
	port: 6170
});

var servers = {};

wss.on("connection", function(connection) {
	console.log("Client Connected");
	connection.on("message", function(message) {
		console.log("Message Received: " + message);

		var messageData = JSON.parse(message);

		if(messageData.type === "createServer") {
			console.log("Creating server");
			var serverCode = "";
			//generate a random 8 digit server code with numbers and letters
			for (var i = 0; i < 8; i++) {
				var char = Math.floor(Math.random() * 36).toString(36);
				if (i === 0 && char === '0') {
					char = '1';
				}
				serverCode += char;
			}
            
			console.log("New server created: " + serverCode)

			servers[serverCode] = {
				clients: [{ws: connection, name: "unnamed", isMuted: false, isDeafened: false}],
			};

            connection.send(JSON.stringify({
                type: "joinServer",
                serverCode: serverCode,
            }));
		} else if(messageData.type === "joinServer") {
            var server = servers[messageData.serverCode];

            if(server === undefined) {
                connection.send(JSON.stringify({
                    type: "joinServerFailed",
                }));
                return;
            }

            connection.send(JSON.stringify({
                type: "joinServer",
                serverCode: messageData.serverCode, 
                users: server.clients.map(function(client) {
                    return { name: client.name, isMuted: client.isMuted, isDeafened: client.isDeafened};
                }),
            }));

            server.clients.push({ws: connection, name: "unnamed", isMuted: false, isDeafened: false});

            updateUsers(messageData.serverCode);
		} else if(messageData.type === "leaveServer"){
            var server = servers[messageData.serverCode];
            var serverDeleted = disconnectClient(connection);

            if(serverDeleted !== true && serverDeleted !== false) {
                updateUsers(serverDeleted);
            }
		} else if(messageData.type === "setName") {
            var server = servers[messageData.serverCode];
            var client = server.clients.find(function(client) {
                return client.ws === connection;
            });
            client.name = messageData.name;

            updateUsers(messageData.serverCode);
        } else if(messageData.type === "audio") {
            var server = servers[messageData.serverCode];

            if(server === undefined) return;

            var parsedAudio = messageData.audio.split(";");
            parsedAudio[0] = 'data:audio/ogg;';
            parsedAudio = parsedAudio[0] + parsedAudio[1];

            for(var i = 0; i < server.clients.length; i++) {
                var client = server.clients[i];
                if(client.ws !== connection) {
                    client.ws.send(JSON.stringify({
                        type: "audio",
                        audio: parsedAudio,
                    }));
                }
            }
        }
	});
    connection.on("close", function() {
        console.log("Client Disconnected");
        var serverDeleted = disconnectClient(connection);

        if(serverDeleted !== true && serverDeleted !== false) {
            updateUsers(serverDeleted);
        }
    });
});

function disconnectClient(connection) {
    //Check if the client is in a server, and if so, remove them from the server. If they are the only client in the server, delete the server.
    var serverDeleted = false;
    
    for(var serverCode in servers) {
        var server = servers[serverCode];
        for(var i = 0; i < server.clients.length; i++) {
            if(server.clients[i].ws === connection) {
                serverDeleted = serverCode;
                server.clients.splice(i, 1);
                if(server.clients.length === 0) {
                    delete servers[serverCode];
                    
                    serverDeleted = true;
                }
                break;
            }
        }
    }
    return serverDeleted;
}

function updateUsers(serverCode) {
    var server = servers[serverCode];
    for(var i = 0; i < server.clients.length; i++) {
        var client = server.clients[i];
        client.ws.send(JSON.stringify({
            type: "updateUsers",
            // EXAMPLE: [{name: "unnamed", ws:{...}}, {name: "dfg", ws:{...}}] => [{name: "unnamed"}, {name: "dfg"}}]
            users: server.clients.filter(function(sortclient) {
                return sortclient !== client;
            }).map(function(sortclient) {
                return { name: sortclient.name, isMuted: sortclient.isMuted, isDeafened: sortclient.isDeafened};
            }),
        }));
    }
}

console.log("Running server!")