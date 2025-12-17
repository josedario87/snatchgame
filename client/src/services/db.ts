import Loki, { Collection } from "lokijs";

export interface LocalPlayerDoc {
  id: string; // fixed id for local profile
  uuid: string; // persistent unique identifier
  name: string;
  color: string;
  stats: {
    totalClicks: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
  };
}

class LocalDBService {
  private db: Loki | null = null;
  private players: Collection<LocalPlayerDoc> | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    return new Promise((resolve) => {
      // In browser, Loki uses localStorage adapter by default; no need to pass one.
      this.db = new Loki("snatchgame.local.db", {
        autoload: true,
        autoloadCallback: () => {
          this.players = this.db!.getCollection<LocalPlayerDoc>("players");
          if (!this.players) {
            this.players = this.db!.addCollection<LocalPlayerDoc>("players", { unique: ["id"] });
          }
          // Ensure local profile exists
          let localPlayer = this.players.by("id", "local");
          if (!localPlayer) {
            this.players.insert({
              id: "local",
              uuid: this.generateUUID(),
              name: "",
              color: "#667eea",
              stats: { totalClicks: 0, gamesPlayed: 0, wins: 0, losses: 0 }
            });
          } else if (!localPlayer.uuid) {
            // Migrate existing profiles to have a UUID
            localPlayer.uuid = this.generateUUID();
            this.players.update(localPlayer);
          }
          this.initialized = true;
          this.db!.saveDatabase(() => resolve());
        },
        autosave: true,
        autosaveInterval: 2000
      } as any);
    });
  }

  private get col(): Collection<LocalPlayerDoc> {
    if (!this.players) throw new Error("LocalDB not initialized");
    return this.players;
  }

  getLocalPlayer(): LocalPlayerDoc {
    const doc = this.col.by("id", "local");
    return doc as LocalPlayerDoc;
  }

  setName(name: string): void {
    const doc = this.getLocalPlayer();
    doc.name = name;
    this.col.update(doc);
    this.db?.saveDatabase();
  }

  setColor(color: string): void {
    const doc = this.getLocalPlayer();
    doc.color = color;
    this.col.update(doc);
    this.db?.saveDatabase();
  }

  incClicks(delta = 1): void {
    const doc = this.getLocalPlayer();
    doc.stats.totalClicks = (doc.stats.totalClicks || 0) + delta;
    this.col.update(doc);
    this.db?.saveDatabase();
  }

  recordGame(result: "win" | "loss"): void {
    const doc = this.getLocalPlayer();
    doc.stats.gamesPlayed = (doc.stats.gamesPlayed || 0) + 1;
    if (result === "win") doc.stats.wins = (doc.stats.wins || 0) + 1;
    else doc.stats.losses = (doc.stats.losses || 0) + 1;
    this.col.update(doc);
    this.db?.saveDatabase();
  }

  getUUID(): string {
    const doc = this.getLocalPlayer();
    if (!doc.uuid) {
      doc.uuid = this.generateUUID();
      this.col.update(doc);
      this.db?.saveDatabase();
    }
    return doc.uuid;
  }

  private generateUUID(): string {
    // Simple UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export const localDB = new LocalDBService();