/* global URL, process, setInterval, clearInterval */
import { createServer } from "vite";
import { appendFileSync } from "node:fs";

const logPath = new URL("./dev-server.log", import.meta.url);

function log(message) {
  appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
}

process.on("uncaughtException", (error) => {
  log(`uncaughtException: ${error.stack ?? error.message}`);
});

process.on("unhandledRejection", (error) => {
  log(`unhandledRejection: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
});

const server = await createServer({
  root: process.cwd(),
  server: {
    host: "localhost",
    port: 3000,
    strictPort: true,
  },
});

await server.listen();
server.printUrls();
log("listening on http://localhost:3000/");

const keepAlive = setInterval(() => {
  log("heartbeat");
}, 60_000);

const close = async () => {
  clearInterval(keepAlive);
  await server.close();
  log("closed");
  process.exit(0);
};

process.on("SIGINT", close);
process.on("SIGTERM", close);
