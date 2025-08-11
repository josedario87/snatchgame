import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("number") clicks: number = 0;
  @type("boolean") connected: boolean = true;
  @type("string") role: string = ""; // 'P1' | 'P2'
  @type("number") pavoTokens: number = 0;
  @type("number") eloteTokens: number = 0;
  @type("number") shameTokens: number = 0;
  @type("string") color: string = "#667eea";

  constructor(sessionId: string, name: string) {
    super();
    this.sessionId = sessionId;
    this.name = name;
    this.clicks = 0;
    this.connected = true;
    this.role = "";
    this.pavoTokens = 0;
    this.eloteTokens = 0;
    this.shameTokens = 0;
    this.color = "#667eea";
  }

  incrementClicks(): void {
    this.clicks++;
  }

  reset(): void {
    this.clicks = 0;
    this.pavoTokens = 0;
    this.eloteTokens = 0;
  }
}
