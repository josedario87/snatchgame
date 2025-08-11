import Loki from "lokijs";

export interface LocalPlayerDoc {
  id: string; // fixed id for local profile
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
          if (!this.players.by("id", "local")) {
            this.players.insert({
              id: "local",
              name: "",
              color: "#667eea",
              stats: { totalClicks: 0, gamesPlayed: 0, wins: 0, losses: 0 }
            });
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
}

export const localDB = new LocalDBService();
