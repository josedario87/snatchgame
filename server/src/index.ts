import { listen } from "@colyseus/tools";
import app from "./app.config";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 2567;

listen(app, PORT);