import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("number") clicks: number = 0;
  @type("boolean") connected: boolean = true;

  constructor(sessionId: string, name: string) {
    super();
    this.sessionId = sessionId;
    this.name = name;
    this.clicks = 0;
    this.connected = true;
  }

  incrementClicks(): void {
    this.clicks++;
  }

  reset(): void {
    this.clicks = 0;
  }
}