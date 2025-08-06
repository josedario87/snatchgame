export class NameManager {
  private static instance: NameManager;
  private nameCounters: Map<string, number> = new Map();
  private sessionToName: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): NameManager {
    if (!NameManager.instance) {
      NameManager.instance = new NameManager();
    }
    return NameManager.instance;
  }

  generateUniquePlayerName(baseName: string, sessionId: string): string {
    const normalizedName = baseName.trim().toLowerCase();
    
    if (!normalizedName) {
      return this.generateUniquePlayerName('player', sessionId);
    }

    const currentCounter = this.nameCounters.get(normalizedName) || 0;
    const newCounter = currentCounter + 1;
    this.nameCounters.set(normalizedName, newCounter);

    const uniqueName = newCounter === 1 ? normalizedName : `${normalizedName}-${newCounter}`;
    this.sessionToName.set(sessionId, uniqueName);

    return uniqueName;
  }

  releasePlayerName(sessionId: string): void {
    const name = this.sessionToName.get(sessionId);
    if (name) {
      this.sessionToName.delete(sessionId);
    }
  }

  getPlayerName(sessionId: string): string | undefined {
    return this.sessionToName.get(sessionId);
  }

  getAllActivePlayers(): string[] {
    return Array.from(this.sessionToName.values());
  }
}