# FHIRcastJS
JavaScript/Node Playground for FHIRcast

This is a minimalistic WIP implementation of the FHIRcast proposal put together for short "hands on training" sessions.

There are only two files with code: endpoint.js and frontend.html.
The endpoint.js file provides all listening endpoint using the express module:
Server (hub)
    /api/hub  
        POST with form query string     
        Receives subscription requests from the clients
    /notify   
        POST with JSON payload                 
        Receive events from the clients 
    /         
    GET with HTML/JavaScript (frontend.html file)       
    Provides the web page to subscribe and post events to the hub
    /log
        Websocket to broadcast the server side logs to the client browser.

Client endpoints
    /client   
        POST with JSON payload                  
        Receive events and subscribtion cancelations from the hub
    /client   
        GET with standard query string          
        Receive callback check from the hub 

Installation
========================================
On Windows,MacOS or linux:
    Install node at nodejs.org
    Install npm, the node package manager
    Clone the github and run "npm install" in its directory.  This will install the modules defined in package.json.
    Run with "node endpoints.js".  This starts the endpoint for the hub and the client.
    Navigate your browser to "http:/localhost:6001/" to access the UI.




