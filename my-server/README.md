## The server.
Runs on Colyseus. Tunnels with Pinggy. Packaged with Caxa.

The core server code was changed for the sake of this practice project. "host.js" merely serves as a tool handling the server and tunnel. Run [it](https://github.com/The-L3rNa3aN/threejs-colyseus-practice/releases/tag/v0.0.0), copy the tunnel link and paste it in the "Create Room (Host)" area in the client.

Or let's say, you aren't happy with the code. Which is why you're here.

### Run immediately without building:
 - Direct CMD or Powershell to "my-server" and run ```node host.js```.
 - To run it without the "host.js" stuff, run ```node build/index.js```.

### Make a build:
 - There are two commands which can be run. The build will be created in "dist".
 - ```npm run build``` compiles the Javascript and Typescript.
 - ```npm run package``` runs "build" and Caxa packs Node, the project and "host.js" into a single executable. **This version will have the CLI interface from "host.js".**
 - You may additionally run it via CMD or Powershell to debug for errors.

-Veman "The L3rNa3aN" Jadhav
