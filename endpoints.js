//      Endpoints Method  Payload(Content type)               Function
//
//  These are for the FHIRcast messages WebSub endpoints:
//    Server (hub)
//      /api/hub  POST    form query string     Receive subscription request from the cleints
//      /notify   POST    JSON                  Receive events from the clients
//
//      /websocket
//
//
//    Client
//      /client   POST    JSON                  Receive events and subscribtion cancelations from the hub
//      /client   GET     query string          Process callback check from the hub 
//
//  This endpoint is to provide the client UI (FHIRcast.html file): 
//
//    /ui         GET     HTML/JavaScript       Provides the web page to subscript and post events

const listeningPort=6001;
const request=require('request');
const express=require('express'), 
    app=express();
var morgan = require('morgan');
var bodyParser=require('body-parser');
var path = require('path');

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended:true}));
