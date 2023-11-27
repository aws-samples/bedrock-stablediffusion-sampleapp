/*
This is a node server for hosting the Stable Diffusion contest web server, running on
port 8002.
*/

var https = require("https"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    express = require('express');
    port = process.env.PORT || 8002;

const upload_image = require('./file_uploader');
const table_writer = require('./table_writer');
const invoke_bedrock = require('./bedrock_client');

var app = express();
const ssl_private_key = process.env.SSL_PRIVATE_KEY;
const ssl_root_cert = process.env.SSL_ROOT_CERT;
const ssl_ca_bundle = process.env.SSL_CA_BUNDLE;

var httpsOptions = {
  key: fs.readFileSync(ssl_private_key),
  cert: fs.readFileSync(ssl_root_cert) 
};

if (ssl_ca_bundle !== "") {
  httpsOptions.ca = fs.readFileSync(ssl_ca_bundle);
}

const server = https.createServer(httpsOptions, app);

app.get(`*`, (request, response) => {
  try {
    var uri = url.parse(request.url).pathname,
        filename = path.join(process.cwd(), uri);
      
    var contentTypesByExtension = {
      '.html': "text/html",
      '.css':  "text/css",
      '.js':   "text/javascript",
      '.jpg': "image/jpeg",
      '.png': "image/png"
    }; 
      
    fs.exists(filename, function(exists) {    
      if(!exists || filename=="prompt_server.js") { // don't serve the server code!
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write("404 Not Found\n");
        response.end();
        return;
    }

      // by default, if no page is requested, serve genai.html
      if (fs.statSync(filename).isDirectory()) {
        filename += 'genai.html';
      }

      // read the requested file and serve it up.
      fs.readFile(filename, "binary", function(err, file) {
        if(err) {
          response.writeHead(500, {"Content-Type": "text/plain"});
          response.write(err + "\n");
          response.end();
          return;
        }

        var headers = {};
        var contentType = contentTypesByExtension[path.extname(filename)];
        if (contentType) headers["Content-Type"] = contentType;
        response.writeHead(200, headers);
        response.write(file, "binary");
        response.end();
      });

    });
  } catch(e) {
    var now = new Date().toJSON().slice(0,10).replace(/-/g,'/');
    var error_text = "HTTPS server error:\n" + now + "\n" + e.toString() + "\n";
    fs.appendFile('error_log.txt', error_text, function (err) {});
  }

});

server.listen(port,'0.0.0.0');

// set up the socket.io server for real time connections from the web client
const { Server } = require("socket.io");
const io = new Server(server);
console.log("Server on!");
table_writer.init();

function send_response(msg, socket) {
    socket.emit("update", msg);
}

// listen for new connections from the web client, and setup listeners
io.on('connection', function(socket) {
    try {
        console.log("New app connected.");

        // this message will be sent when a prompt is submitted for execution in the web client
        // after processing the prompt via Bedrock, the response is sent via the same socket back to the client
        socket.on("prompt", async(message) => {
          await call_Bedrock(message, socket);
        });

        // this message will be sent when a image is submitted for the contest
        socket.on("uploadimage", async(uploadParams) => {
          try {
            const s3filekey = await upload_image(uploadParams);
            await table_writer.record_submission(uploadParams,s3filekey);
            socket.emit("uploadresult", {"success": true});
          } catch(e) {
            socket.emit("uploadresult", {"success": false});
          }

      });
    } catch(e) {
        console.log(e);
        var now = new Date().toJSON().slice(0,10).replace(/-/g,'/');
        var error_text = "HTTPS socket.io error:\n"+now+"\n"+e.toString()+'\n';
        fs.appendFile('error_log.txt', error_text, function (err) {});
    }
});

// runs the prompt via Bedrock, and emits the result back to the client via the same socket
async function call_Bedrock(prompt,socket){
  try {
      var status = "bedrock_error";
      var response = await invoke_bedrock(prompt);
      const textDecoder = new TextDecoder('utf-8');
      const jsonString = textDecoder.decode(response.body.buffer);
  
      const parsedData = JSON.parse(jsonString);
      response = parsedData.artifacts[0].base64.trim();
      status = "bedrock_success";
      send_response([status, response], socket);
      return;
  } catch(e) {
      console.log("Error in calling Bedrock:");
      console.log(e);
      send_response(["error", e], socket);
      return;
  }
}
