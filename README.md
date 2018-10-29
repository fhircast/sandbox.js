# FHIRcast Playground
The FHIRcast Playground is a set of tools to simulate the workflow of the FHIRcast standard using the JavaScript stack.


The following deployments are supported:

* HUB (server and client): https://hub-fhircast.azurewebsites.net/
* EMR client: https://emr-fhircast.azurewebsites.net/
* PACS client: https://pacs-fhircast.azurewebsites.net/
* Reporting client: https://reporting-fhircast.azurewebsites.net/
* AI client: https://ai-fhircast.azurewebsites.net/

FHIRcast is an HL7 specification designed to provide a lightweight, inexpensive and http-based application context synchronization standard. Find out more at [fhircast.org](https://fhircast.org).

The first communication channel defined by FHIRcast is the [W3C WebSub RFC](https://www.w3.org/TR/websub/).  This model defines a "hub" that receives subscribtion requests from clients (subscribers) for specific events.  Client subscribe to events by sending the hub the location where they want to receive the events (hub.callback). The hub then performs a validation by asking the client about a common secret. In the same message, the hub sends the url where the client can send new events to be published (hub.topic).  If this step succeeds, the hub will start forwarding events to the client.

If you are a C#/.net developer, you may prefer to use the [FHIRcast sandbox](https://github.com/fhircast/sandbox).

![frontend](frontend.png)


# Usage
You can start with the [combined hub/client](https://hub-fhircast.azurewebsites.net/) in the cloud.
1. Select the hub that you want to connect to.  Leave the defaults URLs to play around in the standalone hub/client.
2. Select the client endpoint (hub.callback) that will receive the events and then send a subscription request with the send button.  The hub response will be shown in the light gray box next to the button.
3. Send an event to the endpoint specified by the hub in the callback check (hub.topic). The hub response will be shown in the gray box.
4. You can monitor the hub and client endpoints in this text area. The log entries starting with '📡HUB:' and '🖥️CLIENT:' describe backend messages relevant to the standard.  Frontend messages can be seen in your browser console using the browser developer tools. The log entries starting with '🔧UI:' and '🚀WEBSOCKET:' are not relevant to the standard.  They provide information about internal operations.  
  
Next, you can use the [PACS client](https://pacs-fhircast.azurewebsites.net/)  to subscripe and receive events from the hub.  Check the hub.callback input box value of this client.  How does it differ from the hub?

Finally, add the [EMR](https://emr-fhircast.azurewebsites.net/), [AI](https://ai-fhircast.azurewebsites.net/)  and [reporting](https://reporting-fhircast.azurewebsites.net/) clients to simulate a complete workflow.

![workflow](workflow.png)

# Troubleshooting
* **The log text area does not display any messages:**  Possibly the websocket connection between your browser and the hub is not working.  There could be a proxy server in your route that needs a software update or configuration change to support the websocket 'upgrade' http header.  Another possibility is that you are using more websockets than your deployment allows.  For example, the cheapest azure deployment specifies a maximum of 5 sockets.  In any case, the lack of a websocket does not prevent operation.  You should still see the responses to the messages in the small text areas next to the send buttons.
* **The buttons do not work:** Using the browser developer tool, check in the console why the http messages are not going out.  If you are testing with another instance, you may have to enable 'send data across domains' in your browser security settings. Another possibility is that the receiving endpoint does not have the 'Access-Control-Allow-Origin' header. 
* **The log emojis are black and white:**  On Windows 7, you need Office 2016 to have color emojis.


# Installation
## On Windows, MacOS or Linux
1. Install node at http://nodejs.org.
2. Install npm, the node package manager, at http://npmjs.org.
3. Clone or download the github and run "npm install" in its directory.  This will install the modules defined in package.json.
4. Run with "node endpoint.js".  This starts the endpoints for the hub and the client.
5. Navigate your browser to "http://localhost:3000/" to access the UI.


[VScode](https://code.visualstudio.com/) can be used on all platforms for editing and debugging.

## In the Azure cloud

The Azure vscode extension can be used to deploy the app as a web service.  Two critical points are the port environment variable defined in endpoint.js and the launch.json file which tells Azure which program to run. They should not need any modifications.  
Azure will deploy the app with SSL on port 443 so you do not have to handle certificates youself. 

## Environment variables
### MODE
The MODE environment variable can be used to specify if the instance is a hub, an EMR client, a PACS client, an AI client or a reporting client.  If this variable is not set, the instance will be a hub.

### PORT
The PORT environment variable can be used to specify the listening port.  If this variable is not set, the port will be 3000.

# Program Description

There are three files:  endpoints.js, hub.html and package.json.

* The endpoints.js file provides all listening (client and hub) endpoints using Node.js with the express module.  

* The hub.html file is the client UI that triggers the client subscription requests and performs client event notifications to the hub.

* The package.json file specifies the Node.js modules used in the app.
  

## Endpoints description
### Server (hub) endpoints
These two endpoints are not active when the MODE environment variable is set to 'emr','pacs','reporting' or 'ai'.
* "/api/hub": POST with form query string to receive subscription requests from the clients
 
* "/notify": POST with JSON payload to receive events from the clients 

### Client endpoints

* "/client": POST with JSON payload to receive events and subscribtion cancelations from the hub.

* "/client": GET with standard query string to receive callback check from the hub. 

### Utility endpoints (not in the standard)

* "/": GET with HTML/JavaScript to provide the web page to subscribe and post events to the hub.  Default is to return the hub.html file.  If the MODE environment variable is set to 'emr','pacs','reporting' or 'ai'; the file emr.html, pacs.html,reporting.html or ai.html will be returned.

* "/log": (on ws not http), Websocket to broadcast the server side logs to the browser.

These two endpoints are not active when the MODE environment variable is set to 'emr','pacs','reporting' or 'ai'.

* "/status":  POST without content will trigger a hub status message to be broadcasted to the connected websockets.

* "/delete":  POST without content will delete all subscriptions.


## Front-end description

### HTML
The four sections of the web page are each contained in their own division or 'div':  selectHub, subscribe, notify and monitor. Simple styling is embedded to avoid an extra file to maintain.

### JavaScript
The two FHIRcast-relevant functions are **sendEvent()** and **sendSubscription()**.  Both are using 'XMLHttpRequest' instead of the newer 'fetch' function in order to support Internet Explorer.
* sendSubscription():  This function builds a query string using the data from the input fields of section 2 and POSTs it to the hub with 'Content-type' header set to 'application/x-www-form-urlencoded'.
* sendEvent():  This function builds a JSON string using the data from the input fields of section 3 and POSTs it to the hub with 'Content-type' header set to 'application/json'.


Other functions are specific to the playground:
* setURLs(): On page load, this function attemps to preselect the correct endpoints from the three drop-down menus.  
* getHubStatus(): Makes a POST to the hub to trigger the display of active subscriptions when the button is clicked.
* deleteSubscriptions(): Makes a POST to the hub to clear the subscriptions list when the button is clicked.