import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export interface ModuleCache {
  modules: Map<string, string>;
  lastBuilt: Date;
}

export class ModuleDiscoveryService {
  private cache: ModuleCache;
  private readonly moduleRegex = /defmodule\s+([A-Z][A-Za-z0-9_.]*)\s+do/g;

  constructor() {
    this.cache = {
      modules: new Map(),
      lastBuilt: new Date(),
    };
  }

  public async buildCache(): Promise<void> {
    console.log("Building module cache...");
    this.cache.modules.clear();

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      console.log("No workspace folder found");
      return;
    }

    const rootPath = workspaceFolder.uri.fsPath;

    // Scan lib/ and deps/ directories
    await this.scanDirectory(path.join(rootPath, "lib"));
    await this.scanDirectory(path.join(rootPath, "deps"));

    this.cache.lastBuilt = new Date();
    console.log(`Cache built with ${this.cache.modules.size} modules`);
  }

  private async scanDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    try {
      const entries = await fs.promises.readdir(dirPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith(".ex") || entry.name.endsWith(".exs"))
        ) {
          await this.scanFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      const matches = Array.from(content.matchAll(this.moduleRegex));

      for (const match of matches) {
        const fullModuleName = match[1];
        const shortModuleName = this.extractShortName(fullModuleName);

        // Store the mapping from short name to full qualified name
        if (this.cache.modules.has(shortModuleName)) {
          // Handle conflicts by keeping both
          // TODO: show a picker when there are multiple entries
          const existing = this.cache.modules.get(shortModuleName);
          if (existing !== fullModuleName) {
            console.log(
              `Conflict found: ${shortModuleName} -> ${existing} vs ${fullModuleName}`
            );
          }
        } else {
          this.cache.modules.set(shortModuleName, fullModuleName);
        }
      }
    } catch (error) {
      console.error(`Error scanning file ${filePath}:`, error);
    }
  }

  private extractShortName(fullModuleName: string): string {
    const parts = fullModuleName.split(".");
    return parts[parts.length - 1];
  }

  public findModuleByShortName(shortName: string): string | undefined {
    return this.cache.modules.get(shortName);
  }

  public getAllModules(): Map<string, string> {
    return new Map(this.cache.modules);
  }

  public getCacheInfo(): { size: number; lastBuilt: Date } {
    return {
      size: this.cache.modules.size,
      lastBuilt: this.cache.lastBuilt,
    };
  }
}
