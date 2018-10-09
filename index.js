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
var morgan = require('morgan');
var bodyParser=require('body-parser');
var path = require('path');
const express=require('express'), app=express();
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended:true}));
var expressWs = require('express-ws')(app);


//  Global
const port= process.env.PORT || 3000;
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
    if(req.headers['content-type']== 'application/x-www-form-urlencoded') {
      var subscriptionRequest=req.body;
      console_log('HUB: Receiving a subscription request from '+subscriptionRequest['hub.callback'] + 'for event '+subscriptionRequest['hub.events']);
      console_log('HUB: Sending challenge:'+ subscriptionRequest['hub.secret']);
      // Check the supplied callback URL
      request({
          url: subscriptionRequest['hub.callback'],
          qs: {
                "hub.challenge": subscriptionRequest['hub.secret'],
                "hub.topic": "http://localhost:6001/notify",
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
    } 
    else {
      console_log('HUB: Wrong content type');

    }
    res.send(200);
  });
  
//  Receive events from clients with application/json payload
app.use(express.json());
app.post('/notify/',function(req,res){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.json(200);
  console_log('HUB: Receiving event with content: '+ JSON.stringify(req.body));
  //  Broadcast the event to all clients

  subscriptions.forEach(function(subscription) {
    console_log('HUB:  Processing subscription for:' + JSON.stringify(subscription));
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
  console_log(req.body);
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
  console_log('🔥fhircast hub and client listening on port ' + port+'. ');
    
});

