# FHIRcast JavaScript Sandbox
FHIRcast is an HL7 specification designed to provide a lightweight, inexpensive and http-based application context synchronization standard. Find out more at [fhircast.org](http://fhircast.org).

FHIRcast sandboxes provide tools to simulate the workflow of the FHIRcast standard.

This sandbox (sandbox.js) implements the standard using JavaScript and Node.js.

If you are a C#/.net developer, you might prefer to use the other [FHIRcast sandbox](https://github.com/fhircast/sandbox).

The following sandbox.js deployments are available online:
* <a href="https://hub-fhircast.azurewebsites.net/" target="_blank" >HUB (server and client)</a> 
* <a href="https://emr-fhircast.azurewebsites.net/" target="_blank" >EHR  client</a> 
* <a href="https://pacs-fhircast.azurewebsites.net/" target="_blank" >PACS client</a> 
* <a href="https://reporting-fhircast.azurewebsites.net/" target="_blank" >Reporting client</a> 
* <a href="https://ai-fhircast.azurewebsites.net/" target="_blank" >AI client</a> 


The first communication channel proposed by FHIRcast is the [W3C WebSub RFC](https://www.w3.org/TR/websub/).  

This model defines a "hub" that receives subscribtion requests from clients (subscribers) for specific events.  Client subscribe to events by sending the hub the location where they want to receive the events (hub.callback). The hub then performs a validation by asking the client about a common secret. In the same message, the hub sends the url where the client can send new events to be published (hub.topic).  If this step succeeds, the hub will start forwarding events to the client.

# Usage
Start with the <a href="https://hub-fhircast.azurewebsites.net/" target="_blank">combined hub/client</a> in the cloud.
![frontend](/images/frontend.png)
1. Select the hub that you want to connect to.  Leave the defaults URLs to play around in the standalone hub/client.
2. Select the client endpoint (hub.callback) that will receive the events and then send a subscription request with the send button.  The hub response will be shown in the light gray box next to the button.
3. Send an event to the endpoint specified by the hub in the callback check (hub.topic). The hub response will be shown in the gray box.
4. You can monitor the hub and client endpoints in this text area. The log entries starting with '📡HUB:' and '🖥️CLIENT:' describe backend messages relevant to the standard.  Frontend messages can be seen in the browser console using the browser developer tools. The log entries starting with '🔧UI:' and '🚀WEBSOCKET:' are not relevant to the standard.  They provide information about internal operations.  
  
Next, use the [PACS client](https://pacs-fhircast.azurewebsites.net/)  to subscripe and receive events from the hub.  Check the hub.callback input box value of this client.  How does it differ from the hub?

Next, add the [EMR](https://emr-fhircast.azurewebsites.net/), [AI](https://ai-fhircast.azurewebsites.net/)  and [reporting](https://reporting-fhircast.azurewebsites.net/) clients to simulate a complete workflow.

![workflow](/images/workflow.png)


Finally, open two reporting client browser sessions.  Subscribe to an event from one of the browsers and generate an event in the hub.  Do both reporting browsers get a message?

![twoBrowserSessions](/images/twoBrowserSessions.png)

## <img src="/images/SMARTlogo.svg" width="30"> SMART on FHIR launch
One topic for FHIRcast is how to get the latest context when starting up.  The [SMART on FHIR](https://dev.smarthealthit.org/) launch scenario offers a built-in method.  

Test the online [SMART App launcher](https://launch.smarthealthit.org/index.html?auth_error=&fhir_version_1=r2&fhir_version_2=r2&iss=&launch_ehr=1&launch_url=https%3A%2F%2Freporting-fhircast.azurewebsites.net%2F&patient=smart-4444001&prov_skip_auth=1&prov_skip_login=1&provider=COREPRACTITIONER1&pt_skip_auth=1&public_key=&sb=&sde=&sim_ehr=1&token_lifetime=15&user_pt=)  with a preselected patient, provider with the 'App Launch URL' set to the online sandbox.js reporting client. Click the green 'Launch App!' button in the lower right corner.
![SMARTlaunch](/images/SMARTlaunch.png)

This should launch the FHIRcast client within the Simulated EHR and set the context text area with the correct patient context.
![SMARTlaunched](/images/SMARTlaunched.png)
Notice that the 'hub.topic' input textbox has been populated with the SMART session id and the context text area with the correct patient FHIR resource (both highlighted in light yellow).


Alternatively, test the SMART launch by navigating to the SMART launch sandbox: http://launch.smarthealthit.org and selecting a patient, provider and the app url which can be a local instance in debug mode.


## Troubleshooting
* **The log text area does not display any messages:**  Possibly the websocket connection between your browser and the hub is not working.  There could be a proxy server in your route that needs a software update or configuration change to support the websocket 'upgrade' http header.  Another possibility is that you are using more websockets than your deployment allows.  For example, the smallest Azure deployment specifies a maximum of 5 sockets.  In any case, the lack of a websocket does not prevent operation.  You should still see the responses to the messages in the small text areas next to the send buttons but you will not see events being received by the clients.
* **The buttons do not work:** Using the browser developer tool, check in the console why the http messages are not going out.  If you are testing with another instance, you may have to enable 'send data across domains' in your browser security settings. Another possibility is that the receiving endpoint does not have the 'Access-Control-Allow-Origin' header. 
* **Response error 404-Not found:** The configured hub url node may be set to run as a client-only and therefore the hub endpoints are not available.
* **The log emojis are black and white:**  Color emojis require Office 2016 on Windows 7.


# Installation
Installing your own sandbox allows you to learn, fix bugs, propose new features or simply provide a private test environment for your project or institution.
Whether deploying locally or in the cloud, environment variable settings may be needed.

## Environment variables
If no environment variables are set, the instance will run as a combined hub and client.

+ MODE: Specifies if the instance is a 'hub' with a client (subscriber/publisher) or only a 'client'. Default is 'hub'.
+ PORT: Specifies the listening port. Default is 8000. Do not set this variable in cloud deployment.
+ HUB_URL: Specifies the address where the subscriber and publisher will connect to.  Default is http://localhost:8000.
+ CLIENT_URL: Specifies the address where the client node will receive published events.  Default is http://localhost:8000/client.
+ TITLE: Sets the title. Default is 'FHIRcast JavaScript Sandbox - Hub and Client'.
+ BACKGROUND_COLOR: Sets the background color. Default is 'darkgray'.

## Windows and  MacOS
1. Install node at http://nodejs.org.
2. Install npm, the node package manager, at http://npmjs.org.
3. Clone or download the github and run "npm install" in its directory.  This will install the modules defined in package.json.
4. Run with "node sandbox.js".  This starts the endpoints for the hub and the client.
5. Navigate your browser to http://localhost:8000/ to access the UI.


Different port settings are required when running multiple sandboxes locally.
They can be set on the command-line when starting the instance:
```
MODE=client PORT=8001 node sandbox.js
```

Or in launch.json:
```
"configurations": [
    {
        "type": "node",
        "request": "launch",
        "name": "Launch Program",
        "program": "${workspaceFolder}/sandbox.js",
        "env": 
        {
            "MODE":"hub",
            "HUB_URL":"http://localhost:8000",
            "CLIENT_URL":"http://localhost:8000/client",
            "TITLE":"my FHIRcast tester",
            "BACKGROUND_COLOR":"blue"
        }
    }
]
```
  
## Linux
Official Node.js binary distributions are provided by [NodeSource](https://github.com/nodesource/distributions/blob/master/README.md).

### Ubuntu
```
cd sandboxjs        # change directory to where the githib was downloaded
curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -  # Download binaries 
sudo apt-get install -y nodejs  # install
sudo npm install npm --global   # update npm
npm install     # install the modules
node sandbox.js     # start the sandbox
```

## Cloud
Do not set the port environment variable when deploying in a cloud platform.  The cloud service will define it for its environment.

### Azure
The [Visual Studio Code](https://code.visualstudio.com/) Azure App Service [extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azureappservice) can be used for deployments.  
The environment variables can be added to the App Service instance by creating an 'Application Settings' as shown in the following picture.

 ![Azure configuration](/images/AzureConfiguration.png)

### Google
In the Google Cloud Platform, you can deploy with the Compute-App Engine [option](https://console.cloud.google.com/appengine).  The platform uses the app.yaml file for deployment:
```
env: flex
runtime: nodejs
```
This [article](https://medium.com/google-cloud/deploying-a-node-js-app-on-google-cloud-8419de45e5dc) provides an overview of the process.

### Amazon
In AWS, you can use the 'Elastic Beanstalk' deployment to create a WebApp. 
Deployment is done by uploading a zip file containing the four following files:
+ sandbox.js
+ sandbox.html
+ package.json
+ fhir.ico

When creating the application in AWS, choose 'Configure more options' and select 'high'availibility'.  SSL cannot be configured without the load balancer provided with the HA deployment.  You need to have certificates to configure Amazon cloud.
Environment variables are set in the AWS console:
![amazon](/images/amazon.png)

## Mobile (iOS, Android)
Thanks to https://github.com/janeasystems/nodejs-mobile, running Node.js applications and therefore the FHIRcast sandbox is possible. 
![iPhone](/images/iPhone.png)
The description from [Janea Systems](https://code.janeasystems.com/nodejs-mobile/getting-started-ios) has been used by a contributor to run sandbox.js on iOS.

# Program Description

There are two files:  sandbox.js and sandbox.html.

* The sandbox.js file is the backend that runs on Node.js. It provides all listening (client and hub) endpoints using the express module.  

* The sandbox.html file is the frontend and runs in the browser. It triggers the client subscription requests and performs client event notifications to the hub.  It is served to the browser by the sandbox.js app service.


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

* "/log": (on ws not http), Websocket to broadcast the endpoints logs to the browser.

The following two endpoints are not active when the MODE environment variable is set to 'emr','pacs','reporting' or 'ai'.

* "/status":  POST without content will trigger a hub status message to be broadcasted to the connected websockets.

* "/delete":  POST without content will delete all subscriptions.

### SMART handling
The authorization sequence is described [here](http://docs.smarthealthit.org/tutorials/authorization/).

## Front-end description
### HTML
The four sections of the web page are each contained in their own division or 'div':  selectHub, subscribe, publish and monitor. Simple styling is embedded to avoid an extra file to maintain.

### JavaScript
The two FHIRcast-relevant functions are **sendEvent()** and **sendSubscription()**.  Both are using 'XMLHttpRequest' instead of the newer 'fetch' function in order to support Internet Explorer.
* sendSubscription():  This function builds a query string using the data from the input fields of section 2 and POSTs it to the hub with 'Content-type' header set to 'application/x-www-form-urlencoded'.
* sendEvent():  This function builds a JSON string using the data from the input fields of section 3 and POSTs it to the hub with 'Content-type' header set to 'application/json'.


Other functions are specific to the sandbox:
  
* getHubStatus(): Makes a POST to the hub to trigger the display of active subscriptions when the button is clicked.
* deleteSubscriptions(): Makes a POST to the hub to clear the subscriptions list when the button is clicked.

# Contribution
We welcome any contributions to help further enhance this tool for the FHIRcast community ! 

To contribute to this project, please see instructions above for running the application locally and testing the app to make sure the tool works as expected with your incorporated changes. Then issue a pull request on the fhircast/sandbox.js repository with your changes for review.