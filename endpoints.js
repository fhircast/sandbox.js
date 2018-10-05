const help=`
Server (hub)
    Endpoints Method  Payload(Content type) Function
    ====================================================================================================
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
const express=require('express'), 
    app=express();
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended:true}));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

//  Global
const listeningPort=6001;
var subscriptions=[];

//
//    The following two endpoints are for the Hub
//
//  Receive and check subscription requests from clients
app.post('/api/hub/',function(req,res){
    if(req.headers['content-type']== 'application/x-www-form-urlencoded') {
      var subscriptionRequest=req.body;
      console.log('HUB: Receiving a subscription request from '+subscriptionRequest['hub.callback']);
      console.log('HUB: Sending challenge:'+ subscriptionRequest['hub.secret']);
      // Check the supplied callback URL
      request({
          url: subscriptionRequest['hub.callback'],
          qs: {"hub.challenge": subscriptionRequest['hub.secret']}    
        }, function (error, response, body) {
        //console.log('HUB: error:', error); // Print the error if one occurred
        console.log('HUB: Callback check response statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('HUB: Callback check body:', body); 
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
      console.log('HUB: Wrong content type');

    }
  });
  
//  Receive events from clients with application/json payload
app.use(express.json());
app.post('/notify/',function(req,res){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.json(200);
  console.log('HUB: Receiving event with content: '+ JSON.stringify(req.body));
  //  Broadcast the event to all clients
  for(subscription in subscriptions) {
    console.log('HUB:  Processing subscription for:' + subscription.callback)
  }
});

//
//    The following two endpoints are for the client
//

//  Client listener for callback check,unsubscribe and receive events  
//  Callback check from the hub with query string payload
app.get('/client/',function(req,res){
  console.log('CLIENT: Callback checked by the hub.');
  console.log('CLIENT: Sending back challenge: '+req.query['hub.challenge']);
  res.send(200,req.query['hub.challenge']);
});

//  Receive events from the hub with application/json payload
app.post('/client/',function(req,res){
  console.log(req.body);
  res.json(200,{'context':req.body});
});

//
//  This endpoint is to server the client web page
//  UI
app.get('/',function(req,res){
  console.log('UI:  user interface requested');
  res.sendFile(path.join(__dirname + '/frontend.html'));
});


app.listen(listeningPort,function(){
    console.log('Listening on port ' + listeningPort+' on the following endpoints:');
    console.log(help);
});
