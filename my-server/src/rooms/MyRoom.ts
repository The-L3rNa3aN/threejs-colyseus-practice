import { Room, Client, CloseCode } from "colyseus";
import { MyRoomState } from "./schema/MyRoomState.js";

export class MyRoom extends Room
{
	maxClients = 4;
	state = new MyRoomState();
	private playerNames = new Map<string, string>();

	messages =
	{
		yourMessageType: (client: Client, message: any) => {  //Handle "yourMessageType" message.
			console.log(client.sessionId, "sent a message:", message);
		},
	};

	onCreate(options: any) {  //Called when a new room is created.
		console.log("Room created!");

		this.onMessage("chat", (client, message) =>
		{
			let name = this.playerNames.get(client.sessionId) || client.sessionId;

			console.log(`Chat from ${client.sessionId}: `, message);
			this.broadcast("chat", { from: name, text: message?.text ?? message ?? "" }, { except: client });
		});

		this.onMessage("*", (client, type, message) => { console.log(`Unhandled message type "${type}" from ${client.sessionId}: `, message) });
	}

	onJoin(client: Client, options: any) {  //Called when a client joins the room.
		let playerName = options?.name || "Anonymous";

		this.playerNames.set(client.sessionId, playerName);
		console.log(`${playerName} joined!`);
		this.broadcast("chat", { from: "System", text: `${playerName} joined the room` }, { except: client });
	}
	
	onLeave(client: Client, code: CloseCode) {  //Called when a client leaves the room.
		let name = this.playerNames.get(client.sessionId) || client.sessionId;
		
		console.log(`${name} left!`, code);
		this.broadcast("chat", { from: "System", text: `${name} left the room` });
		this.playerNames.delete(client.sessionId);
	}

	onDispose() { //Called when the room is disposed.
		console.log("room", this.roomId, "disposing...");
	}
}
