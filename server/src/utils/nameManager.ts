export class NameManager {
  private static instance: NameManager;
  private uuidToName: Map<string, string> = new Map();
  
  // For shuffle functionality
  private roomAssignments: Map<string, { roomId: string; role: 'P1' | 'P2' }> = new Map();
  private shuffleInProgress: boolean = false;

  private constructor() {}

  static getInstance(): NameManager {
    if (!NameManager.instance) {
      NameManager.instance = new NameManager();
    }
    return NameManager.instance;
  }

  generateUniquePlayerName(baseName: string, uuid: string): string {
    // If UUID already has a name, return it
    const existingName = this.uuidToName.get(uuid);
    if (existingName) {
      return existingName;
    }

    const normalizedName = baseName.trim().toLowerCase();
    if (!normalizedName) {
      // Default base name when none is provided
      return this.generateUniquePlayerName('guest', uuid);
    }

    // Try exact name if not in use; otherwise, append incremental suffixes
    const isInUse = (name: string) => {
      for (const val of this.uuidToName.values()) {
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

    this.uuidToName.set(uuid, uniqueName);
    return uniqueName;
  }

  releasePlayerName(uuid: string): void {
    // Names are now persistent per UUID, so we don't release them
    // They only get cleared when the server restarts
  }

  getPlayerName(uuid: string): string | undefined {
    return this.uuidToName.get(uuid);
  }

  getAllActivePlayers(): string[] {
    return Array.from(this.uuidToName.values());
  }

  // Shuffle functionality methods
  startShuffle(): void {
    this.shuffleInProgress = true;
    this.roomAssignments.clear();
  }

  endShuffle(): void {
    this.shuffleInProgress = false;
    this.roomAssignments.clear();
  }

  isShuffleInProgress(): boolean {
    return this.shuffleInProgress;
  }

  assignPlayerToRoom(uuid: string, roomId: string, role: 'P1' | 'P2'): void {
    this.roomAssignments.set(uuid, { roomId, role });
  }

  getPlayerRoomAssignment(uuid: string): { roomId: string; role: 'P1' | 'P2' } | undefined {
    return this.roomAssignments.get(uuid);
  }

  removePlayerRoomAssignment(uuid: string): void {
    this.roomAssignments.delete(uuid);
  }

  getAllRoomAssignments(): Map<string, { roomId: string; role: 'P1' | 'P2' }> {
    return new Map(this.roomAssignments);
  }
}