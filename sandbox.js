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
var conferences=[];
var lastContext=[];
var logSockets=[];
var pageLoads=0;
var env ={};
var userCount=0;
env.port= process.env.PORT || 5000;  
env.hubURL= process.env.HUB_URL || 'http://localhost:'+env.port;
env.hubEndpoint = process.env.HUB_ENDPOINT || '/api/hub/';
env.clientURL = process.env.CLIENT_URL || 'http://localhost:'+env.port+'/client';
env.title = process.env.TITLE ||'FHIRcast JS Sandbox - Hub and Client';
env.backgroundColor = process.env.BACKGROUND_COLOR ||'darkgray' ;
env.mode = process.env.MODE || 'hub'; 
//env.dbURI= process.env.DB_URI || 'mongodb://hub-fhircast:hub-fhircast1@ds048279.mlab.com:48279/hub-fhircast';
//env.dbURI= process.env.DB_URI || 'mongodb://hub-fhircast:hub-fhircast123@ds048279.mlab.com2:48279/hub-fhircast';

app.listen(env.port,function(){
  console_log('🔧 Web service: Started on port '+ env.port +' at  '+ Date());
});