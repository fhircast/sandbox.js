const os = require( 'os' );
const morgan = require('morgan');
const bodyParser=require('body-parser');
const path = require('path');
const favicon = require('serve-favicon');
const express=require('express'), app=express();
const expressWs = require('express-ws')(app);
const axios = require('axios');
const request = require('request');
const crypto=require('crypto');

app.use(morgan('dev'));
app.use(express.json());  
app.use(bodyParser.urlencoded({extended:true}));
app.use(favicon(path.join(__dirname + '/fhir.ico')))
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var subscriptions=[];
var lastContext={};
var logSockets=[];
var pageLoads=0;
var env ={};
env.port= process.env.PORT || 3000;  
env.hubURL= process.env.HUB_URL || 'http://localhost:'+env.port;
env.hubEndpoint = process.env.HUB_ENDPOINT || '/api/hub/';
env.clientURL = process.env.CLIENT_URL || 'http://localhost:'+env.port+'/client';
env.title = process.env.TITLE ||'FHIRcast JS Sandbox - Hub and Client';
env.backgroundColor = process.env.BACKGROUND_COLOR ||'darkgray' ;
env.mode = process.env.MODE || 'hub'; 
env.defaultContext= process.env.DEFAULT_CONTEXT || `[{
  "key": "patient",
  "resource": 
  {
  "resourceType": "Patient",
  "id": "ewUbXT9RWEbSj5wPEdgRaBw3",
  "identifier": [
      {
      "system": "urn:oid:1.2.840.114350",
      "value": "185444"
      },
      {
      "system": "urn:oid:1.2.840.114350.1.13.861.1.7.5.737384.27000",
      "value": "2667"
      }
  ]
  }
  }]`;

if (env.mode!='client') {

  // HUB:  Receive and check subscription requests from clients
  app.post(env.hubEndpoint, async function(req,res){  
    var subscriptionRequest=req.body;
    console_log('📡HUB: Receiving a subscription request from '+subscriptionRequest['hub.callback'] + ' for event '+subscriptionRequest['hub.events']);
    // Check if it's a websub or websocket channel
    var checkResult={};
    if (typeof subscriptionRequest['hub.channel.type'] === 'undefined') {
      // websub - Check the supplied callback URL
      checkResult= await checkSubscriptionRequest(subscriptionRequest);
      subscriptionRequest['hub.channel.type']='websub';
    } else {
      // websocket - 
      subscriptionRequest['hub.channel.type']='websocket';
      checkResult.status =200;
      checkResult.data= subscriptionRequest['hub.secret'];
    }

    console_log('📡HUB: Receiving response from the client. status code:' + checkResult.status + ', challenge: '+ checkResult.data); // Print the response status code if a response was received
    // if code =200 and secret
    if (checkResult.status == 200 && checkResult.data == subscriptionRequest['hub.secret']) {
      //  add or remove subscription
      var subscription = {
        channel: subscriptionRequest['hub.channel.type'],
        endpoint: subscriptionRequest['hub.channel.endpoint'],
        callback: subscriptionRequest['hub.callback'],
        events: subscriptionRequest['hub.events'],
        secret: subscriptionRequest['hub.secret'],
        topic: subscriptionRequest['hub.topic'],
        lease: subscriptionRequest['hub.lease'],
        session: subscriptionRequest['hub.topic'],
      };
      if (subscriptionRequest['hub.mode'] == 'subscribe') {
        subscriptions.push(subscription);
        console_log('📡HUB: Subscription added for session:' + subscriptionRequest['hub.topic'] + ', event:' + subscriptionRequest['hub.events']); // Print the response status code if a response was received
      }
      else {
        subscriptions = subscriptions.filter(function (obj) {
          return obj.events !== subscriptionRequest['hub.events'] && obj.session !== subscriptionRequest['hub.topic'];
        });
        console_log('📡HUB: Subscription removed for session:' + subscriptionRequest['hub.topic'] + ', event:' + subscriptionRequest['hub.events']);
      }
      res.send(202);
      console_log('📡HUB: Sending subscription response statusCode: 202'); // Print the response status code if a response was received
  } else {
    res.send(500);
    console_log('📡HUB: Sending subscription response statusCode: 500'); // Print the response status code if a response was received
  }
});
 
  async function checkSubscriptionRequest(subscriptionRequest){
    console_log('📡HUB: Sending challenge:'+ subscriptionRequest['hub.secret']);
    await axios.get(subscriptionRequest['hub.callback'],{
        params: {
          "hub.challenge": subscriptionRequest['hub.secret'],
          "hub.topic": subscriptionRequest['hub.topic']
        }
    })  
    .then(function (response) { axios_response=response;})
    .catch(function (error) {console.log(error);})
    return(axios_response);
  }

  // HUB: Receive events from clients with application/json payload  
  app.post(env.hubEndpoint+':topic',function(reqNotify,resNotify){
    resNotify.send(200);
    console_log('📡HUB: Receiving event with topic: '+ reqNotify.params.topic +' and with content: '+ JSON.stringify(reqNotify.body));
    //  Broadcast the event to all clients
    sendEvents(reqNotify.body)
  });
  
  // HUB: Receive context request from clients with with session id in the query string  
  app.get(env.hubEndpoint+':topic',function(req,res){
    console_log('📡HUB: Receiving context request for session id: '+req.params.topic);
    res.send(200,lastContext);
  });
  
  // HUB: Return hub status in the log - Internal - Not part of the standard
  app.post('/status',function(req,res){
    var message=''; 
    if(req.get('host').indexOf('azure')<1){ // do not show host or ip for azure-not useful
      message+='Listening on '+os.hostname +':' + env.port+'. IP addresses';
      const ifaces = os.networkInterfaces( );
      Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;
        ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
          }
          if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            message+=': ' + ifname + ':' + alias +' '+ iface.address;
          } else {
            // this interface has only one ipv4 adress
            message+=': ' + ifname +' '+ iface.address;
          }
          ++alias;
        });
      });
    }
    else {message='Running in Azure cloud.'}
    if (logSockets.length==1)  { message='There is 1 browser connected to the UI. '+message;}
    else { message='There are '+logSockets.length+' browsers connected to the UI. '+message;}
    console_log('🔧UI: Hub status requested: The hub has '+subscriptions.length +' active subscriptions. '+message);
    subscriptions.forEach(function(subscription) {
      console_log('🔧UI:   Client "'+subscription.callback+'" with session id "'+subscription.session+'"subscribed to event: ' + subscription.events);
    });
    res.send(200);
  });
  console_log('🔧 Web service: Hub and Client mode.');
}
else {
  console_log('🔧 Web service: Client-only mode.');
} 

// CLIENT: listener for callback check,unsubscribe and receive events with query string payload 
app.get('/client/',function(req,res){
  console_log('🖥️CLIENT: Receiving callback check from the hub.');
  console_log('🖥️CLIENT: The hub specified this endpoint to receive events: '+req.query['hub.topic']);
  console_log('🖥️CLIENT: Sending back challenge: '+req.query['hub.challenge']);
  res.send(200,req.query['hub.challenge']);
});

// CLIENT: Receive events from the hub with application/json payload
app.post('/client/',function(req,res){
  console_log('🖥️CLIENT: Receiving notification from the hub: '+JSON.stringify(req.body) );
  res.json(200,{'context':req.body});
  console_log('🖥️CLIENT: Checking x-hub-signature in header: ' + JSON.stringify(req.headers['x-hub-signature']) );
  const hmac = crypto.createHmac('sha256','secret');
  hmac.update(JSON.stringify(req.body));
  console_log('🖥️CLIENT: HMAC calculation from secret is: sha256=' + hmac.digest('hex') );
  console.log();
});


// CLIENT: send environment variable
app.post('/mode/',function(req,res){res.send(env);});

// HTML5 web messaging demo
app.get('/webmsg/',function(req,res){res.sendFile(path.join(__dirname + '/webmessage.html'));  });

//  UI This endpoint is to serve the websocket client web page
app.get('/websocket/',function(req,res){res.sendFile(path.join(__dirname + '/websocket.html'));  });

//  UI This endpoint is to serve the websub client web page
app.get('/',function(req,res){  
if(req.originalUrl.indexOf('launch')>0){
    console_log('🔥SMART_ON_FHIR®: Launch detected. '); 
    console_log('🔥SMART_ON_FHIR®: Requesting auth server and other info from FHiR server :'+req.query.iss);
    res.sendFile(path.join(__dirname + '/SMARTlaunch.html')); 
  } 
  else 
  {
    res.sendFile(path.join(__dirname + '/sandbox.html')); 
    // Log page loads and uptime on new session.
    pageLoads++; 
    function format(seconds){
      function pad(s){
        return (s < 10 ? '0' : '') + s;
      }
      var hours = Math.floor(seconds / (60*60));
      var minutes = Math.floor(seconds % (60*60) / 60);
      var seconds = Math.floor(seconds % 60);
      return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
    }
    var uptime = process.uptime();
    console_log('🔧UI: Home page requested '+pageLoads+' times in '+format(uptime)+' uptime.');
  }
});
 
 //  websocket publish endpoint
 app.ws('/bind/:endpoint', function(publishWebsocket, req) {
  console_log('Accepting websocket connection.');
  // check if we have a subscription for this socket
  subscriptions.forEach(function(subscription) {
    if(subscription.endpoint==req.params.endpoint ) {
      console_log('📡HUB: Binding websocket for: '+ req.params.endpoint);
      subscription.websocket=publishWebsocket;   
      var confirmation={};
      var timestamp= new Date();
      confirmation.timestamp= timestamp.toJSON();
      confirmation.bound=req.params.endpoint;
      publishWebsocket.send(JSON.stringify(confirmation));
    }
  });
  
  //  here we receive events to publish
  publishWebsocket.on('message', function(msg) {
    console_log('Receiving event on Websocket: ' + msg);
    sendEvents(JSON.parse(msg));
  });
  
  publishWebsocket.on('close', function(msg) { 
    console_log(' Websocket closed.');
    // should we delete relatd subscription here or wait for reconnect?
  });
});

function sendEvents(notification){
  lastContext=notification.event['context'];  
  subscriptions.forEach(function(subscription) {
    if(subscription.events.includes(notification.event['hub.event'])) {
      console_log('📡HUB:Found a subscription for '+subscription.events);
      const hmac = crypto.createHmac('sha256',subscription.secret);
      hmac.update(JSON.stringify(notification));
      if (subscription.channel=='websocket') {
        subscription.websocket.send(JSON.stringify(notification));        
        console_log('📡HUB: Sent notification to websocket.'); // Print the response status code if a response was received
      } else {  // not websocket- send json post
        request.post({
          url: subscription['callback'] ,
          method: 'POST',
          json: true,
          body: notification,
          headers:  {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'X-Hub-Signature': 'sha256=' + hmac.digest('hex')
           }    
        }, function (error, response, body) {
            console_log('📡HUB: Sent notification response statusCode:'+response.statusCode); // Print the response status code if a response was received
            console.log(body);
            console.log(response);
            console.log(error);
        });
        console_log('📡HUB: Sent notification to websub.');
      }
     }  
  });
}

// Websocket to provide the logs to the client 
app.ws('/log', function(ws, req) {
  ws.onmessage= e => {
    logSockets.push(ws);
    console_log('🚀WEBSOCKET: Accepting logging connection number '+ logSockets.length+ ' with ID:'+e.data +'.');
  }
  ws.on('close', function(msg) {
    logSockets = logSockets.filter(item => item !== ws);
    console_log('🚀WEBSOCKET:  One websocket closed. '+ logSockets.length +' remaining.');
  });
});  

function console_log(msg){
  console.log(msg);
  logSockets.forEach(function(socket) { 
    if (socket.readyState==1) {socket.send(msg+'\n');} 
  });
 }

// UI: Clear all subscriptions
app.delete(env.hubEndpoint,function(req,res){
  subscriptions=[];
  console_log('🔧UI: All subscriptions cleared.');
  res.send(200);
});

app.listen(env.port,function(){
  console_log('🔧 Web service: Started on port '+ env.port +' at  '+ Date());
});