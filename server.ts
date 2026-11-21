import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createApiApp } from "./src/server/app.ts";

async function startServer() {
  const app = express();
  app.use(createApiApp());

  const isProduction = process.env.NODE_ENV === "production";
  const distDir = path.resolve(process.cwd(), "dist");

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`Hearth server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
