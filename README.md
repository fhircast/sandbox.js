# FHIRcastJS
JavaScript/Node Sandbox for FHIRcast

This is a minimalistic WIP implementation of the FHIRcast proposal put together for short "hands on training" sessions.

FHIRcast is a new draft standard to facilitate front-end integration between vendors.  Find out more at fhircast.org. [http://fhircast.org].

There is C#/dotnet sandbox that is more developed at:

# Description

There are only two files:  endpoints.js and frontend.html.

The endpoints.js file provides all listening endpoint using the express module:

## Server (hub)

"/api/hub": POST with form query string to receive subscription requests from the clients
 
 
 "/notify": POST with JSON payload to receive events from the clients 


"/": GET with HTML/JavaScript (frontend.html file) to provide the web page to subscribe and post events to the hub.


"/log": (on ws not http), Websocket to broadcast the server side logs to the client browser.

## Client endpoints

"/client": POST with JSON payload to receive events and subscribtion cancelations from the hub.


"/client": GET with standard query string to receive callback check from the hub 

Installation
========================================
On Windows or MacOS:
1. Install node at nodejs.org
2. Install npm, the node package manager
3. Clone the github and run "npm install" in its directory.  This will install the modules defined in package.json.
4. Run with "node endpoints.js".  This starts the endpoint for the hub and the client.
5. Navigate your browser to "http://localhost:6001/" to access the UI.




