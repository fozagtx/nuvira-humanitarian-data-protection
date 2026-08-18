import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(import.meta.dirname, "../..", "dist", "public"),
    path.resolve(import.meta.dirname, "public"),
  ].find(candidate => fs.existsSync(candidate));
  if (!distPath) {
    console.error("Could not find the client build directory (dist/public). Run pnpm build first.");
    return;
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
