http = require("http");
fs = require("fs");
socketio = require("socket.io");
var Gpio = require('onoff').Gpio;

var REL1 = new Gpio(23, 'high');
var REL2 = new Gpio(24, 'high');

REL1.writeSync(1);
REL2.writeSync(1);



function loadFile(filename) {
    file_content = fs.readFileSync("./html-pages/" + filename, "utf-8");

    return file_content;

}



function executeCommand(redundant, command, socket) {
    command = command.toString();
    command = command.replace(/(\r\n|\n|\r)/gm, "");
    options = { timeout: 10000 };

    if (!redundant) {
        var exec = require("child_process").exec;
        exec(command, options, function (err, stdout, stderr) {
            if (err) {
                socket.emit("broadcast", "There was an error : " + err.message);
            } else {
                socket.emit("broadcast", stdout);
            }
        });
    } else {
        var spawn = require("child_process").spawn;
        child = spawn(command);

        child.stdout.on('data', function (data) {
            socket.emit("broadcast", data);
        });

        child.stderr.on('data', function (data) {
            socket.emit("broadcast", data);
        });

    }

}





function handleRequest(method, url, body) {

    content = "";

    switch (url) {


        case "/":
            content = loadFile("control-panel.html");
            socketio.listen(server).on('connection', function (socket) {
                console.log("a new connection to the panel was made...");

                socket.on("message", function (msg) {
                    command_set = msg.split("{#}");
                    switch (command_set[0]) {
                        case "cmd":
                            // output = executeCommand(false, command_set[1]);     
                            // socket.emit("broadcast", output);
                            executeCommand(true, command_set[1], socket);
                            break;
                        case "tgl":

                            rel_numer = command_set[1];

                            relay = eval("REL" + rel_numer);
                            relay_status = relay.readSync();
                            if (relay_status == 1) {
                                relay.writeSync(0);
                            } else {
                                relay.writeSync(1);
                            }


                            break;

                        case "all":


                            if (command_set[1] == "on") {
                                relay_mode = 0;
                            } else {
                                relay_mode = 1;
                            }


                            for (i = 1; i <= 2; i++) {

                                relay = eval("REL" + i);
                                relay.writeSync(relay_mode);
                            }







                            break;
                    }
                });
            });


            break;


    }

    return content;




}



// -----------------------------------------------------------------------------------






console.log("starting");

server = http.createServer();

server_settings = { port: 8080, hostname: "localhost" }



server.on("request", function (request, response) {

    if (request.method == "GET") {
        final_body = "";
        response.write(handleRequest(request.method, request.url, final_body));
        response.end();


    } else {
        body = [];

        request.on("data", function (chunk) {

            body.push(chunk);
        });

        request.on("end", function () {
            final_body = Buffer.concat(body).toString();
            response.write(handleRequest(request.method, request.url, final_body));
            response.end();
        });
    }

});






server.listen(server_settings);

