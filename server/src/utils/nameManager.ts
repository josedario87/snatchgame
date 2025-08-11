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
      // Default base name when none is provided
      return this.generateUniquePlayerName('guest', sessionId);
    }

    // Try exact name if not in use; otherwise, append incremental suffixes
    const isInUse = (name: string) => {
      for (const val of this.sessionToName.values()) {
        if (val === name) return true;
      }
      return false;
    };

    let uniqueName = normalizedName;
    if (isInUse(uniqueName)) {
      let n = 2;
      while (isInUse(`${normalizedName}-${n}`)) n++;
      uniqueName = `${normalizedName}-${n}`;
    }

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
