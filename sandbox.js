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
const mongoose = require('mongoose');

app.use(morgan('dev'));
app.use(express.json());  
app.use(bodyParser.urlencoded({extended:true}));
app.use(favicon(path.join(__dirname + '/fhir.ico')))
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,Authorization");
  res.header("Cross-Origin-Opener-Policy", "same-origin");
  res.header("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

var subscriptions=[];
var lastContext={};
var logSockets=[];
var pageLoads=0;
var env ={};
env.port= process.env.PORT || 5000;  
env.hubURL= process.env.HUB_URL || 'http://localhost:'+env.port;
env.hubEndpoint = process.env.HUB_ENDPOINT || '/api/hub/';
env.clientURL = process.env.CLIENT_URL || 'http://localhost:'+env.port+'/client';
env.title = process.env.TITLE ||'FHIRcast JS Sandbox - Hub and Client';
env.backgroundColor = process.env.BACKGROUND_COLOR ||'darkgray' ;
env.mode = process.env.MODE || 'hub'; 
//env.dbURI= process.env.DB_URI || 'mongodb://hub-fhircast:hub-fhircast1@ds048279.mlab.com:48279/hub-fhircast';
//env.dbURI= process.env.DB_URI || 'mongodb://hub-fhircast:hub-fhircast123@ds048279.mlab.com2:48279/hub-fhircast';
env.defaultContext= process.env.DEFAULT_CONTEXT || `[
  {
    "key": "patient",
    "resource": {
      "resourceType": "Patient",
      "id": "ewUbXT9RWEbSj5wPEdgRaBw3",
      "identifier": [
        {
          "system": "urn:oid:1.2.840.114350",
          "value": "M1"
        },
        {
          "system": "urn:oid:1.2.840.114350.1.13.861.1.7.5.737384.27000",
          "value": "2667"
        }
      ]
    }
  },
  {
    "key": "study",
    "resource": {
      "resourceType": "ImagingStudy",
      "id": "8i7tbu6fby5ftfbku6fniuf",
      "uid": "urn:oid:1.2.276.0.7230010.3.1.2.2723277605.10168.1676054414.178",
      "identifier": [
        {
          "system": "7678",
          "value": "REMOVED"
        }
      ],
      "patient": {
        "reference": "Patient/ewUbXT9RWEbSj5wPEdgRaBw3"
      }
    }
  }
]`;


if (env.mode!='client') {

  //  connect to mongodb and define collections
 // mongoose.connect(env.dbURI,{ useNewUrlParser: true },function(err) {
//    if(err){ console_log('📡HUB: Mongo db error' + err);}
//    else { console_log('📡HUB: Connected to mongodb.');}
//  });
//  var ClientApp= mongoose.model('ClientApp',{ClientAppID: String,Name: String,Secret: String},'ClientApp');
//  var ClientAppUser=mongoose.model('ClientAppUser',{ClientAppUserID: String,ClientAppID: String,Username: String,UserIdentityID: String},'ClientAppUser');
//  var UserIdentity=mongoose.model('UserIdentity',{UserIdentityID: String,Topic: String,FirstName: String,LastName: String},'UserIdentity');
 
  // HUB:  Receive and check subscription requests from clients

  // Heartbeat timer



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

   // console_log('📡HUB: Receiving response from the client. status code:' + checkResult.status + ', challenge: '+ checkResult.data); // Print the response status code if a response was received
    // if code =200 and secret
    if (checkResult.status == 200 && checkResult.data == subscriptionRequest['hub.secret']) {
      //  add or remove subscription

      var protocol='ws:';
      if (env.hubURL.includes('https:')) { protocol='wss:';}
      const url= new URL(env.hubURL+env.hubEndpoint);
      var websocket_endpoint=Math.random().toString(36).substring(2, 16); //  random number  websocket endpoint
      var websocket_url=protocol+'//' + url.host + '/bind/'+websocket_endpoint;
      var subscription = {
        channel: subscriptionRequest['hub.channel.type'],
        endpoint: websocket_url,
        websocket_endpoint: websocket_endpoint,
        callback: subscriptionRequest['hub.callback'],
        events: subscriptionRequest['hub.events'],
        secret: subscriptionRequest['hub.secret'] || 'secret',
        topic: subscriptionRequest['hub.topic'],
        lease: subscriptionRequest['hub.lease'],
        session: subscriptionRequest['hub.topic'],
        subscriber: subscriptionRequest['subscriber.name']
      };
      if (subscriptionRequest['hub.mode'] == 'subscribe') {
        subscriptions.push(subscription);
        console_log('📡HUB: Subscription added for ' + subscriptionRequest['subscriber.name']+': ' + subscriptionRequest['hub.topic'] + ', event:' + subscriptionRequest['hub.events']); // Print the response status code if a response was received
      }
      else {
        // close the websocket
        subscriptions.forEach(function (subscription) {  
          if (subscription.websocket && (
                subscription.subscriber===subscriptionRequest['subscriber.name'] || 
                subscription.endpoint===subscriptionRequest['hub.channel.endpoint'] ) ) {
              subscription.websocket.close();
          }
        });
        // remove the subscription from the list
        subscriptions = subscriptions.filter(function (obj) {
          return obj.events !== subscriptionRequest['hub.events'] && obj.session !== subscriptionRequest['hub.topic'];
        });
        console_log('📡HUB: Subscription removed for ' + subscriptionRequest['subscriber.name']+': '+ subscriptionRequest['hub.topic'] + ', event:' + subscriptionRequest['hub.events']);
      }
      
      const responseBody = {
        "hub.channel.endpoint": subscription.endpoint

     }

      res.send(202,responseBody);
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
  
    // STU3 HUB: Receive events from clients with application/json payload  
    app.post(env.hubEndpoint,function(reqNotify,resNotify){
      resNotify.send(200);
      console_log('📡HUB: Receiving event with topic: '+ reqNotify.params.topic +' and with content: '+ JSON.stringify(reqNotify.body));
      //  Broadcast the event to all clients
      sendEvents(reqNotify.body)
    });
  
    
  // HUB: Receive context request from clients with with session id in the query string  
  app.get(env.hubEndpoint+':topic',function(req,res){
   if (req.params.topic == 'authenticate'){
    console_log('📡HUB: Receiving topic request for user: '+req.query.username+' and secret: '+req.query.secret);
    ClientApp.findOne({Secret: req.query.secret},function(err,ClientAppFound){
      if (ClientAppFound) {
        console_log('📡HUB: The secret matches with app: '+ClientAppFound.Name);  
        // check if the username is existing for this app
        ClientAppUser.findOne({ClientAppID:ClientAppFound.ClientAppID, UserName:req.query.username},function(err,UserFound){
          if (UserFound) {
            // Look up the topic for this user
            console_log('📡HUB: The user id is: '+UserFound.UserIdentityID); 
            UserIdentity.findOne({UserIdentityID: UserFound.UserIdentityID}, function(err,UserIDFound){
              console_log('📡HUB: The topic is: '+UserIDFound.Topic); 
              res.send(200,UserIDFound.Topic);
            });
          }
          else {
            res.send(404,'Username not found for this app');
          }
        });         
      }
      else {
        res.send(404,'Client App not found for this secret');
      }
    }
    );
   }
   else {
      console_log('📡HUB: Receiving context request for session id: '+req.params.topic);
      res.send(200,lastContext);
    }
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
      console_log('🔧UI:   Client "'+subscription.subscriber+'" with session id "'+subscription.session+'"subscribed to event: ' + subscription.events);
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
app.use('/ohif',express.static(path.join(__dirname,'/ohif')));

app.get('/ohif/*',function(req,res){  
  res.sendFile(path.join(__dirname,'/','index.html')); 
});


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
 // console_log('📡HUB: Accepting websocket connection.');
  // check if we have a subscription for this socket
  subscriptions.forEach(function(subscription) {
    if(subscription.websocket_endpoint==req.params.endpoint ) {
      if (subscription.websocket == null) {
        console_log('📡HUB: Binding websocket for: '+ req.params.endpoint);
        subscription.websocket=publishWebsocket;   
        var confirmation={};
        var timestamp= new Date();
        confirmation.timestamp= timestamp.toJSON();
        confirmation.bound=req.params.endpoint;
        confirmation['hub.mode']='subscribe';      
        confirmation['hub.lease_seconds']=7200;
        console_log('📡HUB: sending confirmation: '+ JSON.stringify(confirmation));
        publishWebsocket.send(JSON.stringify(confirmation));
      }
    }
    else {console_log('📡HUB: no matching endpoint for websocket for: '+ req.params.endpoint); }
  });
  
  //  here we receive events to publish
  publishWebsocket.on('message', function(msg) {
    console_log('📡HUB: Receiving event on Websocket: ' + msg);
    try { sendEvents(JSON.parse(msg)); }
    catch(err) {//console_log('Message is not an event: ' + msg);
      }
    
  });
  
  publishWebsocket.on('close', function(msg) { 
    console_log(' Websocket closed.');
    // should we delete relatd subscription here or wait for reconnect?
  });
});


function sendEvents(notification){

  // set the response to get context request
  if (notification.event['hub.event'].toLowerCase().includes('close')) {
    lastContext={};
  } else {
    lastContext=notification.event.context;  
  }
  
  subscriptions.forEach(function(subscription) {
    if(subscription.events.toLowerCase().includes(notification.event['hub.event'].toLowerCase())) {
      console_log('📡HUB:Found a subscription for '+subscription.events);
      const hmac = crypto.createHmac('sha256',subscription.secret);
      hmac.update(JSON.stringify(notification));
      if (subscription.channel=='websocket') {
        if (subscription.websocket.readyState==1)
        {
          subscription.websocket.send(JSON.stringify(notification));        
          console_log('📡HUB: Sent notification to websocket.'); 
        }
        else {console_log('📡HUB: This websocket is not open!'); }
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
  
  subscriptions.forEach(subscribtion=>{
    subscribtion.websocket.close();
  });
  subscriptions=[];
  console_log('🔧UI: All subscriptions cleared.');
  res.send(200);
});

//  Powercast - This endpoint is to simulate the powercast connector
app.get('/api/powercast-connector/configuration',function(req,res){
  res.send({"test_endpoint": "https://nuance-testserver/test/teste",});
 });

 app.get('/api/powercast-connector/login',function(req,res){
  res.send({"authorization_endpoint": "https://nuance-auth0-server/oauth/authorize",});
 });

 app.post('/oauth/token',function(req,res){
  res.send({"token_type":"Bearer","expires_in":3600,"scope":"openid","topic":"Session-DrXray","id_token":"gwYjQtMDhlMTMBOEV4nSsl4OVItuPg0GPe40VTA","access_token":"eyJhbGvz2X4saFXwWOsTVTwVIr13R8w"});
  console_log('📡HUB: Sent token.'); 
});

 function sendWebsocketHeartbeat() {
  subscriptions.forEach(function(subscription) {
    if (subscription.channel=='websocket') {
      try { 
        const heartbeatPayload = {
          timestamp: new Date().toISOString(),
          id: 'JS SANDBOX',
          event: {
            'hub.topic': subscription.topic,
            'hub.event': 'heartbeat',
          },
        };
        subscription.websocket.send(JSON.stringify(heartbeatPayload));
      }
      catch(err){
        console_log('📡HUB: Error sending heartbeat to :'+subscription.subscriber);
        // remove from subscriptions
        subscriptions = subscriptions.filter(function (obj) {
          return obj !== subscription;
        });

      }
    } 
  });
}
const hearbeat = setInterval(sendWebsocketHeartbeat,15000);


app.listen(env.port,function(){
  console_log('🔧 Web service: Started on port '+ env.port +' at  '+ Date());
});