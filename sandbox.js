const os = require( 'os' );
const EventEmitter = require('events');
const request=require('request');
const morgan = require('morgan');
const bodyParser=require('body-parser');
const path = require('path');
const favicon = require('serve-favicon');
const express=require('express'), app=express();
const expressWs = require('express-ws')(app);

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
var logWebsocket='';
var socketCount=0;
var pageLoads=0;
var env ={};
env.hubURL= process.env.HUB_URL || 'http://localhost:8000';
env.hubSubscribe = process.env.HUB_SUBSCRIBE || '/api/hub/';
env.hubPublish = process.env.HUB_PUBLISH || '/notify/';
env.clientURL = process.env.CLIENT_URL || 'http://localhost:8000/client';
env.title = process.env.TITLE ||'FHIRcast JavaScript Sandbox - Hub and Client';
env.backgroundColor = process.env.BACKGROUND_COLOR ||'darkgray' ;
env.mode = process.env.MODE || 'hub'; 
env.port= process.env.PORT || 8000;  // Do not set this env var if deploying in the cloud.  The cloud service will set it.

if (env.mode!='client') {
  // HUB:  Receive and check subscription requests from clients
  app.post('/api/hub/',function(req,res){  
    var subscriptionRequest=req.body;
    console_log('📡HUB: Receiving a subscription request from '+subscriptionRequest['hub.callback'] + ' for event '+subscriptionRequest['hub.events']);
    console_log('📡HUB: Sending challenge:'+ subscriptionRequest['hub.secret']);
    // Check the supplied callback URL
    request({
        url: subscriptionRequest['hub.callback'],
        qs: {
              "hub.challenge": subscriptionRequest['hub.secret'],
              "hub.topic": env.hubURL+env.hubPublish,
            }    
      }, function (error, response, body) {
      //console.log('HUB: error:', error); // Print the error if one occurred
      console_log('📡HUB: Callback check challenge response: ' + body); 
      console_log('📡HUB: Sending callback check response statusCode:' + response.statusCode); // Print the response status code if a response was received
      var subscription = {
          channel:"websub",
          callback: subscriptionRequest['hub.callback'],
          events: subscriptionRequest['hub.events'],
          secret: subscriptionRequest['hub.secret'],
          topic: subscriptionRequest['hub.topic'],
          lease: subscriptionRequest['hub.lease'],
          session: subscriptionRequest['hub.topic'],
        };
      subscriptions.push(subscription);
    });
    res.send(202);
    console_log('📡HUB: Sending subscription response statusCode: 202'); // Print the response status code if a response was received
  });

  // HUB: Receive events from clients with application/json payload  
  app.post('/notify/',function(reqNotify,resNotify){
    resNotify.send(200);
    console_log('📡HUB: Receiving event with content: '+ JSON.stringify(reqNotify.body));
    //  Broadcast the event to all clients
    notification=reqNotify.body;
    lastContext=notification.event['context'];
    subscriptions.forEach(function(subscription) {
      console_log('📡HUB:  Processing subscription for:' + JSON.stringify(subscription));
      if( subscription.events==notification.event['hub.event'] &&
          subscription.session==notification['cast-session']
      ){
        console_log('📡HUB: Found subscription for: '+ notification.event['hub.event']+' session:'+notification['cast-session']);
        // Send the notification to the client
        request.post({
          url: subscription['callback'] ,
          method: 'POST',
          json: true,
          body: notification    
        }, function (error, response, body) {
            console_log('📡HUB: Sent notification response statusCode:'+response.statusCode); // Print the response status code if a response was received
            console.log(body);
            console.log(response);
            console.log(error);
        });
      }
      else {
        console_log('📡HUB: No subscription found for: '+ notification['id'] +' event name:'+notification.event['hub.event']);
      }
    });
  });
  
  // HUB: Receive context request from clients with with session id in the query string  
  app.get('/notify/',function(req,res){
    res.send(200,lastContext);
    req.query['sessionId'];
    console_log('📡HUB: Receiving context request with session id: '+req.query['sessionId']);
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
    if (socketCount==1)  { message='There is 1 browser connected to the UI. '+message;}
    else { message='There are '+socketCount+' browsers connected to the UI. '+message;}
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
  console_log('🖥️CLIENT: Receiving notification from the hub: '+JSON.stringify(req.body));
  res.json(200,{'context':req.body});
});


// CLIENT: send environment variable
app.post('/mode/',function(req,res){res.send(env);});

//  UI This endpoint is to serve the client web page
app.get('/',function(req,res){  
  if(req.originalUrl.indexOf('launch')>0){
    console_log('🔥SMART_ON_FHIR: Launch detected. '); 
    console_log('🔥SMART_ON_FHIR: Requesting auth server and other info from FHiR server :'+req.query.iss);
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

// Websocket to provide the logs to the client 
function console_log(msg){
  console.log(msg);
  logWebsocket+=msg+'\n';
 }
 
 app.ws('/log', function(ws, req) {
  socketCount++;
  //console_log('🚀WEBSOCKET:  Accepting connection number '+socketCount+'.');
  ws.onmessage= e => {
    //ws.id=e.data ;  // We recive our session id from the browser on connect
    console_log('🚀WEBSOCKET: Accepting connection number '+socketCount+ ' with ID:'+e.data +'.');
  
  }

  ws.on('close', function(msg) {
    socketCount--;
    console_log('🚀WEBSOCKET:  One websocket closed. '+socketCount+' remaining.');
  });

  var logWss = expressWs.getWss('/log');

  //var event = new Event('log');
  //event.addEventListener('log', function (e) {
  //  if (ws.readyState==1) {
  //    logWss.clients.forEach(function (client) {
  //      client.send(e);
  //      console.log('Websocket message sent to: '+client.id );
  //    }, false);
  //  }
  //});

  //document.addEventListener("log", function(e) {
  //  console.log(e.detail); // Prints "Example of an event"
  //});

  setInterval(() => { 
      if (logWebsocket!='') {       
        if (ws.readyState==1) {
          logWss.clients.forEach(function (client) {
            client.send(logWebsocket);
            console.log('Websocket message sent to: '+client.id );
         });
        logWebsocket='';
        } 
      } 
    },500);

});  


// UI: Clear all subscriptions
app.post('/delete',function(req,res){
  subscriptions=[];
  console_log('🔧UI: All subscriptions cleared.');
  res.send(200);
});

app.listen(env.port,function(){
  console_log('🔧 Web service: Started on port '+ env.port +' at  '+ Date());
});

