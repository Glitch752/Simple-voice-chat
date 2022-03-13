const wsc = new WebSocket((window.location.protocol === "http:" ? "ws" : "wss") + "://" + window.location.host + "/ws/"); 
//.split(':')[0] is to take out the port section

wsc.onopen = function() {
	console.log("Connected to server!");
}

var currentServerCode = "";

var muted = false;
var deafened = false;

var users = [];

wsc.onmessage = function(event) {
	var messageData = JSON.parse(event.data);
	if(messageData.type === "joinServerFailed") {
		shakeElement(document.getElementById("serverCodeInput"));
	} else if(messageData.type === "joinServer") {
		currentServerCode = messageData.serverCode;
		var joinContainer = document.getElementById("joinContainer");
		joinContainer.style.display = "none";

		var serverCodeElement = document.getElementById("serverCode");
		serverCodeElement.innerHTML = currentServerCode;

		users = messageData.users;
		updateUsers();
	} else if(messageData.type === "leaveServerComplete") {
		alert("You left " + currentServerCode)
	} else if(messageData.type === "updateUsers") {
		users = messageData.users;
		updateUsers();
	} else if(messageData.type === "audio") {
        if(deafened || currentServerCode === "") return;

        var audio = new Audio(messageData.audio);
        audio.play();
    }
}

var bufferTime = 300; //The amount of tiem in milliseconds to store the microphone data until it is sent to the server

window.onload = function() {
	var nameInput = document.getElementById("nameInputField");
	nameInput.addEventListener("keyup", function(event) {
		wsc.send(JSON.stringify({
			type: "setName",
			name: event.target.value,
			serverCode: currentServerCode,
		}));
	});

	navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
		var mediaRecorder = new MediaRecorder(stream);
		mediaRecorder.start();

		var audioChunks = [];

		mediaRecorder.addEventListener("dataavailable", function(event) {
			audioChunks.push(event.data);
		});

		mediaRecorder.addEventListener("stop", function() {
			var audioBlob = new Blob(audioChunks);

            audioChunks = [];

            var fileReader = new FileReader();
            fileReader.readAsDataURL(audioBlob);
            fileReader.onloadend = function() {
                if(muted || currentServerCode === "") return;

                var audioBase64 = fileReader.result;
                wsc.send(JSON.stringify({
                    type: "audio",
                    serverCode: currentServerCode,
                    audio: audioBase64,
                }));
            };

            mediaRecorder.start();

            setTimeout(function() {
                mediaRecorder.stop();
            }, bufferTime);
        });

        setTimeout(function() {
            mediaRecorder.stop();
        }, bufferTime);
    });
};

function createServer() {
	wsc.send(JSON.stringify({
		type: "createServer",
	}));
}

function updateUsers() {
	var otherUsers = document.getElementById("otherUsers");
	otherUsers.innerHTML = "";
	for(var i = 0; i < users.length; i++) {
		var user = users[i];
		otherUsers.innerHTML += `
			<div class="user-other">
				<div class="user-other-icon">
					${
						user.isDeafened ? `<svg class="deafened-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M192 319.1C185.8 313.7 177.6 310.6 169.4 310.6S153 313.7 146.8 319.1l-137.4 137.4C3.124 463.6 0 471.8 0 480c0 18.3 14.96 31.1 31.1 31.1c8.188 0 16.38-3.124 22.62-9.371l137.4-137.4c6.247-6.247 9.371-14.44 9.371-22.62S198.3 326.2 192 319.1zM200 240c0-22.06 17.94-40 40-40s40 17.94 40 40c0 13.25 10.75 24 24 24s24-10.75 24-24c0-48.53-39.47-88-88-88S152 191.5 152 240c0 13.25 10.75 24 24 24S200 253.3 200 240zM511.1 31.1c0-8.188-3.124-16.38-9.371-22.62s-14.44-9.372-22.63-9.372s-16.38 3.124-22.62 9.372L416 50.75c-6.248 6.248-9.372 14.44-9.372 22.63c0 8.188 3.123 16.38 9.37 22.62c6.247 6.248 14.44 9.372 22.63 9.372s16.38-3.124 22.63-9.372l41.38-41.38C508.9 48.37 511.1 40.18 511.1 31.1zM415.1 241.6c0-57.78-42.91-177.6-175.1-177.6c-153.6 0-175.2 150.8-175.2 160.4c0 17.32 14.99 31.58 32.75 31.58c16.61 0 29.25-13.07 31.24-29.55c6.711-55.39 54.02-98.45 111.2-98.45c80.45 0 111.2 75.56 111.2 119.6c0 57.94-38.22 98.14-46.37 106.3L288 370.7v13.25c0 31.4-22.71 57.58-52.58 62.98C220.4 449.7 208 463.3 208 478.6c0 17.95 14.72 32.09 32.03 32.09c4.805 0 100.5-14.34 111.2-112.7C412.6 335.8 415.1 263.4 415.1 241.6z"/></svg>`
						: ``
					}
					${
						user.isMuted ? `<svg class="muted-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M383.1 464l-39.1-.0001v-33.77c20.6-2.824 39.98-9.402 57.69-18.72l-43.26-33.91c-14.66 4.65-30.28 7.179-46.68 6.144C245.7 379.6 191.1 317.1 191.1 250.9V247.2L143.1 209.5l.0001 38.61c0 89.65 63.97 169.6 151.1 181.7v34.15l-40 .0001c-17.67 0-31.1 14.33-31.1 31.1C223.1 504.8 231.2 512 239.1 512h159.1c8.838 0 15.1-7.164 15.1-15.1C415.1 478.3 401.7 464 383.1 464zM630.8 469.1l-159.3-124.9c15.37-25.94 24.53-55.91 24.53-88.21V216c0-13.25-10.75-24-23.1-24c-13.25 0-24 10.75-24 24l-.0001 39.1c0 21.12-5.559 40.77-14.77 58.24l-25.72-20.16c5.234-11.68 8.493-24.42 8.493-38.08l-.001-155.1c0-52.57-40.52-98.41-93.07-99.97c-54.37-1.617-98.93 41.95-98.93 95.95l0 54.25L38.81 5.111C34.41 1.673 29.19 0 24.03 0C16.91 0 9.839 3.158 5.12 9.189c-8.187 10.44-6.37 25.53 4.068 33.7l591.1 463.1c10.5 8.203 25.57 6.328 33.69-4.078C643.1 492.4 641.2 477.3 630.8 469.1z"/></svg>`
						: ``
					}
				</div>
				<div class="user-other-name">
					<h1>${user.name}</h1>
				</div>
			</div>
		`;
	}
}

function joinServer() {
	var serverCodeElem = document.getElementById("serverCodeInput");
	
	var serverCode = serverCodeElem.value;

	serverCode = serverCode.trim();

	if(serverCode === "") {
		shakeElement(serverCodeElem);
		return;
	}

	wsc.send(JSON.stringify({
		type: "joinServer",
		serverCode: serverCode,
	}));
}

function shakeElement(element) {
	//Add the shake class to an element for 1 second
	element.classList.add("shake");
	setTimeout(function() { 
		element.classList.remove("shake");
	}, 1000);
}

function mute() {
	muted = !muted;

	var muteIcon = document.getElementById("muteIcon");
	var unMuteIcon = document.getElementById("unMuteIcon");
	
	if(!muted) {
		muteIcon.style.display = "none";
		unMuteIcon.style.display = "block";
	} else {
		muteIcon.style.display = "block";
		unMuteIcon.style.display = "none";
	}    
}

function deafen() {
	deafened = !deafened;

	var deafenIcon = document.getElementById("deafenIcon");
	var unDeafenIcon = document.getElementById("unDeafenIcon");

	if(!deafened) {
		deafenIcon.style.display = "none";
		unDeafenIcon.style.display = "block";
	} else {
		deafenIcon.style.display = "block";
		unDeafenIcon.style.display = "none";
	}
}

function leaveCall() {
	wsc.send(JSON.stringify({
		type: "leaveServer",
		serverCode: currentServerCode,
	}));

	alert("You left " + currentServerCode);

	currentServerCode = "";

	var joinContainer = document.getElementById("joinContainer");
	joinContainer.style.display = "flex";

	var serverCodeElement = document.getElementById("serverCode");
	serverCodeElement.innerHTML = "";

	var otherUsers = document.getElementById("otherUsers");
	otherUsers.innerHTML = "";
}