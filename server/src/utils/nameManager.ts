export class NameManager {
  private static instance: NameManager;
  private uuidToName: Map<string, string> = new Map();
  private uuidToColor: Map<string, string> = new Map();
  private uuidToShame: Map<string, number> = new Map();
  private uuidToSystemHistory: Map<string, {
    timestamp: number;
    kind: string;
    text: string;
    roomId?: string;
    variant?: string;
    gameVariant?: string;
    round?: number;
    role?: 'P1' | 'P2' | '';
    pavoTokens?: number;
    eloteTokens?: number;
    shameTokens?: number;
  }[]> = new Map();
  
  // For shuffle functionality
  private roomAssignments: Map<string, { roomId: string; role: 'P1' | 'P2' }> = new Map();
  private shuffleInProgress: boolean = false;
  private uuidToCurrentRoom: Map<string, string> = new Map();
  private uuidToReconnectToken: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): NameManager {
    if (!NameManager.instance) {
      NameManager.instance = new NameManager();
    }
    return NameManager.instance;
  }

  // Legacy method used for first-time assignment; keeps global uniqueness.
  generateUniquePlayerName(baseName: string, uuid: string): string {
    const normalizedName = (baseName || '').trim().toLowerCase() || 'guest';
    return this.setPlayerName(uuid, normalizedName);
  }

  // Explicitly set/update the name for a UUID, ensuring uniqueness across other UUIDs.
  setPlayerName(uuid: string, baseName: string): string {
    const normalizedName = (baseName || '').trim().toLowerCase() || 'guest';

    const isInUseByOther = (name: string) => {
      for (const [k, v] of this.uuidToName.entries()) {
        if (k !== uuid && v === name) return true;
      }
      return false;
    };

    let uniqueName = normalizedName;
    if (isInUseByOther(uniqueName)) {
      let n = 2;
      while (isInUseByOther(`${normalizedName}-${n}`)) n++;
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

  // Color persistence per UUID
  setPlayerColor(uuid: string, color: string): void {
    const sanitized = (color || '').toString().trim();
    if (!sanitized) return;
    this.uuidToColor.set(uuid, sanitized);
  }

  getPlayerColor(uuid: string): string | undefined {
    return this.uuidToColor.get(uuid);
  }

  getAllActivePlayers(): string[] {
    return Array.from(this.uuidToName.values());
  }

  // List all UUIDs that have any stored profile data
  getAllKnownUuids(): string[] {
    const set = new Set<string>();
    this.uuidToName.forEach((_, k) => set.add(k));
    this.uuidToColor.forEach((_, k) => set.add(k));
    this.uuidToShame.forEach((_, k) => set.add(k));
    this.uuidToSystemHistory.forEach((_, k) => set.add(k));
    return Array.from(set.values());
  }

  // Sticky shame tokens per UUID
  setShameTokens(uuid: string, count: number): void {
    const n = Math.max(0, Math.floor(count || 0));
    this.uuidToShame.set(uuid, n);
  }

  getShameTokens(uuid: string): number {
    return this.uuidToShame.get(uuid) || 0;
  }

  // Clear stored profile data for a UUID (name, color, shame)
  clearPlayerProfile(uuid: string): void {
    if (!uuid) return;
    this.uuidToName.delete(uuid);
    this.uuidToColor.delete(uuid);
    this.uuidToShame.set(uuid, 0);
    this.uuidToSystemHistory.delete(uuid);
  }

  // Current game room assignment (for reconnection by UUID)
  setCurrentRoom(uuid: string, roomId: string): void {
    if (!uuid || !roomId) return;
    this.uuidToCurrentRoom.set(uuid, roomId);
  }

  getCurrentRoom(uuid: string): string | undefined {
    return this.uuidToCurrentRoom.get(uuid);
  }

  clearCurrentRoom(uuid: string): void {
    this.uuidToCurrentRoom.delete(uuid);
  }

  // Reconnection token per UUID (to join locked rooms)
  setReconnectToken(uuid: string, token: string): void {
    if (!uuid || !token) return;
    this.uuidToReconnectToken.set(uuid, token);
  }

  getReconnectToken(uuid: string): string | undefined {
    return this.uuidToReconnectToken.get(uuid);
  }

  clearReconnectToken(uuid: string): void {
    this.uuidToReconnectToken.delete(uuid);
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

  // Per-UUID system message history (as seen while connected)
  appendSystemMessage(uuid: string, entry: {
    timestamp: number; kind: string; text: string;
    roomId?: string; variant?: string; gameVariant?: string; round?: number;
    role?: 'P1'|'P2'|''; pavoTokens?: number; eloteTokens?: number; shameTokens?: number;
  }): void {
    if (!uuid) return;
    const list = this.uuidToSystemHistory.get(uuid) || [];
    list.push({
      timestamp: Number(entry.timestamp) || Date.now(),
      kind: (entry.kind || '').toString(),
      text: (entry.text || '').toString(),
      roomId: entry.roomId,
      variant: entry.variant || entry.gameVariant,
      gameVariant: entry.gameVariant || entry.variant,
      round: entry.round,
      role: entry.role || '',
      pavoTokens: Number(entry.pavoTokens ?? 0),
      eloteTokens: Number(entry.eloteTokens ?? 0),
      shameTokens: Number(entry.shameTokens ?? 0),
    });
    if (list.length > 1000) list.splice(0, list.length - 1000);
    this.uuidToSystemHistory.set(uuid, list);
  }

  getSystemHistory(uuid: string): {
    timestamp: number; kind: string; text: string;
    roomId?: string; variant?: string; gameVariant?: string; round?: number;
    role?: 'P1'|'P2'|''; pavoTokens?: number; eloteTokens?: number; shameTokens?: number;
  }[] {
    return [...(this.uuidToSystemHistory.get(uuid) || [])];
  }

  clearSystemHistory(uuid: string): void {
    this.uuidToSystemHistory.delete(uuid);
  }

  // Export/Import methods for backup/restore functionality
  exportState(): any {
    return {
      version: "1.0",
      timestamp: Date.now(),
      data: {
        uuidToName: Object.fromEntries(this.uuidToName),
        uuidToColor: Object.fromEntries(this.uuidToColor),
        uuidToShame: Object.fromEntries(this.uuidToShame),
        uuidToSystemHistory: Object.fromEntries(this.uuidToSystemHistory),
        uuidToCurrentRoom: Object.fromEntries(this.uuidToCurrentRoom),
        uuidToReconnectToken: Object.fromEntries(this.uuidToReconnectToken),
        roomAssignments: Object.fromEntries(this.roomAssignments),
        shuffleInProgress: this.shuffleInProgress
      }
    };
  }

  importState(state: any): void {
    if (!state || !state.data) {
      throw new Error('Invalid state format');
    }

    const { data } = state;

    // Clear current state
    this.uuidToName.clear();
    this.uuidToColor.clear();
    this.uuidToShame.clear();
    this.uuidToSystemHistory.clear();
    this.uuidToCurrentRoom.clear();
    this.uuidToReconnectToken.clear();
    this.roomAssignments.clear();

    // Import data
    if (data.uuidToName) {
      for (const [uuid, name] of Object.entries(data.uuidToName)) {
        if (typeof name === 'string') {
          this.uuidToName.set(uuid, name);
        }
      }
    }

    if (data.uuidToColor) {
      for (const [uuid, color] of Object.entries(data.uuidToColor)) {
        if (typeof color === 'string') {
          this.uuidToColor.set(uuid, color);
        }
      }
    }

    if (data.uuidToShame) {
      for (const [uuid, shame] of Object.entries(data.uuidToShame)) {
        if (typeof shame === 'number') {
          this.uuidToShame.set(uuid, shame);
        }
      }
    }

    if (data.uuidToSystemHistory) {
      for (const [uuid, history] of Object.entries(data.uuidToSystemHistory)) {
        if (Array.isArray(history)) {
          this.uuidToSystemHistory.set(uuid, history);
        }
      }
    }

    if (data.uuidToCurrentRoom) {
      for (const [uuid, roomId] of Object.entries(data.uuidToCurrentRoom)) {
        if (typeof roomId === 'string') {
          this.uuidToCurrentRoom.set(uuid, roomId);
        }
      }
    }

    if (data.uuidToReconnectToken) {
      for (const [uuid, token] of Object.entries(data.uuidToReconnectToken)) {
        if (typeof token === 'string') {
          this.uuidToReconnectToken.set(uuid, token);
        }
      }
    }

    if (data.roomAssignments) {
      for (const [uuid, assignment] of Object.entries(data.roomAssignments)) {
        if (assignment && typeof assignment === 'object' && 
            'roomId' in assignment && 'role' in assignment) {
          this.roomAssignments.set(uuid, assignment as { roomId: string; role: 'P1' | 'P2' });
        }
      }
    }

    if (typeof data.shuffleInProgress === 'boolean') {
      this.shuffleInProgress = data.shuffleInProgress;
    }
  }
}
