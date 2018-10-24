const help=`
Server (hub)
    /api/hub  POST    form query string     Receive subscription request from the clients
    /notify   POST    JSON                  Receive events from the clients

Client endpoints
    /client   POST    JSON                  Receive events and subscribtion cancelations from the hub
    /client   GET     query string          Receive callback check from the hub 

Client front-end (frontend.html file): 
    /         GET     HTML/JavaScript       Provides the web page to subscribe and post events to the hub
`

const request=require('request');
const morgan = require('morgan');
const bodyParser=require('body-parser');
const path = require('path');
const express=require('express'), app=express();
const expressWs = require('express-ws')(app);
const os = require( 'os' );

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended:true}));
const ifaces = os.networkInterfaces( );



//  Global
port= process.env.PORT || 3000;
hostname = os.hostname();
subscriptions=[];
logWebsocket='';

function console_log(msg){
 console.log(msg);
 logWebsocket+=msg+'\n';
}

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//
//    The following two endpoints are for the Hub
//
//  Receive and check subscription requests from clients
app.post('/api/hub/',function(req,res){
    var subscriptionRequest=req.body;
    console_log('HUB: Receiving a subscription request from '+subscriptionRequest['hub.callback'] + ' for event '+subscriptionRequest['hub.events']);
    console_log('HUB: Sending challenge:'+ subscriptionRequest['hub.secret']);
    // Check the supplied callback URL
    request({
        url: subscriptionRequest['hub.callback'],
        qs: {
              "hub.challenge": subscriptionRequest['hub.secret'],
              "hub.topic": "http://"+hostname+":"+port+"/notify",
            }    
      }, function (error, response, body) {
      //console.log('HUB: error:', error); // Print the error if one occurred
      console_log('HUB: Callback check challenge response: ' + body); 
      console_log('HUB: Sending callback check response statusCode:' + response.statusCode); // Print the response status code if a response was received
      var subscription = {
          channel:"websub",
          callback: subscriptionRequest['hub.callback'],
          events: subscriptionRequest['hub.events'],
          secret: subscriptionRequest['hub.secret'],
          topic: subscriptionRequest['hub.topic'],
          lease: subscriptionRequest['hub.lease'],
        };
      subscriptions.push(subscription);

    });
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.send(202);
  });
  
//  Receive events from clients with application/json payload
app.use(express.json());
app.post('/notify/',function(reqNotify,resNotify){
  resNotify.header("Access-Control-Allow-Origin", "*");
  resNotify.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  resNotify.send(200);
  console_log('HUB: Receiving event with content: '+ JSON.stringify(reqNotify.body));
  //  Broadcast the event to all clients
  notification=reqNotify.body.event;
  subscriptions.forEach(function(subscription) {
    console_log('HUB:  Processing subscription for:' + JSON.stringify(subscription));
    if(subscription.events==notification['hub.event']){
      console_log('HUB: Found subscription for: '+ notification['hub.event']);
      // Send the notification to the client
      request.post({
        url: subscription['callback'] ,
        method: 'POST',
        json: true,
        body: notification    
      }, function (error, response, body) {
           console_log('HUB: Sent notification response statusCode:'+response.statusCode); // Print the response status code if a response was received
           console.log(body);
           console.log(response);
           console.log(error);
      });
    }
   });

});

//
//    The following two endpoints are for the client
//

//  Client listener for callback check,unsubscribe and receive events  
//  Callback check from the hub with query string payload
app.get('/client/',function(req,res){
  console_log('CLIENT: Receiving callback check from the hub.');
  console_log('CLIENT: The hub specified this endpoint to receive events: '+req.query['hub.topic']);
  console_log('CLIENT: Sending back challenge: '+req.query['hub.challenge']);
  res.send(200,req.query['hub.challenge']);
});

//  Receive events from the hub with application/json payload
app.post('/client/',function(req,res){
  console_log('CLIENT: Receiving notification from the hub.');
  console_log(JSON.stringify(req.body));
  res.json(200,{'context':req.body});
});

//
//  This endpoint is to server the client web page
//  UI
app.get('/',function(req,res){
  console_log('UI:  user interface frontend.html file requested');
  res.sendFile(path.join(__dirname + '/frontend.html'));
});


app.ws('/log', function(ws, req) {
  ws.on('connection', req => {
    console.log(uuid.v4());
  });
  
//  ws.on('message', function(msg) {
   // ws.send(logWebsocket);
  //});
  
  ws.on('close', function(msg) {
    console.log('websocket closed');
  });

  setInterval(() => { 
      //ws.send(`${new Date()}`);
      if (logWebsocket!='') {
       
        if (ws.readyState==1) {
          ws.send(logWebsocket);
          logWebsocket='';
        }
      } 
    },1000);
});


app.listen(port,function(){
  //console_log(help);
  console_log('🔥FHIRcast hub and client listening on '+hostname +':' + port+' and IP addresses: ');
  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;
    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
  
      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        console_log('   ' + ifname + ':' + alias +' '+ iface.address);
      } else {
        // this interface has only one ipv4 adress
        console_log('   ' + ifname +' '+ iface.address);
      }
      ++alias;
    });
  });
  
});

