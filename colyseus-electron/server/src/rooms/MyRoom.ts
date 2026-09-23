import { Room, Client, CloseCode } from "colyseus";
import { MyRoomState } from "./schema/MyRoomState.js";

export class MyRoom extends Room {
  maxClients = 4;
  state = new MyRoomState();

  messages = {
    yourMessageType: (client: Client, message: any) => {  //Handle "yourMessageType" message.
      console.log(client.sessionId, "sent a message:", message);
    },
  };

  onCreate(options: any) {  //Called when a new room is created
    console.log("Room created!");

    this.onMessage("chat", (client, message) =>
      {
        console.log(`Chat from ${client.sessionId}: `, message);

        let name =client.userData?.name || client.sessionId;

        this.broadcast("chat", { from: name, text: message?.text ?? message ?? "" }, { except: client });
      });

    this.onMessage("*", (client, type, message) => { console.log(`Unhandled message type "${type}" from ${client.sessionId}: `, message) });
  }

  onJoin(client: Client, options: any) {  //Called when a client joins the room.
    // let playerName = options?.name || `Player_${client.sessionId.slice(0, 4)}`;
    // console.log(`${playerName} (${client.sessionId}), joined!`);

    client.userData = { name: options?.name || "Anonymous"};
    console.log(`${client.userData.name} joined`);
  }

  onLeave(client: Client, code: CloseCode) {  //Called when a client leaves the room.
    console.log(client.sessionId, "left!", code);
  }

  onDispose() { //Called when the room is disposed.
    console.log("room", this.roomId, "disposing...");
  }

}
