import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export interface ModuleCache {
  modules: Map<string, string[]>;
  lastBuilt: Date;
}

export class ModuleDiscoveryService {
  private cache: ModuleCache;
  private readonly moduleRegex = /defmodule\s+([A-Z][A-Za-z0-9_.]*)\s+do/g;
  private readonly outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.cache = {
      modules: new Map<string, string[]>(),
      lastBuilt: new Date(),
    };
    this.outputChannel = outputChannel;
  }

  public async buildCache(): Promise<void> {
    this.outputChannel.appendLine("Building module cache...");
    this.cache.modules.clear();

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      this.outputChannel.appendLine("No workspace folder found");
      return;
    }

    const rootPath = workspaceFolder.uri.fsPath;

    // Scan lib/ and deps/ directories
    await this.scanDirectory(path.join(rootPath, "lib"));
    await this.scanDirectory(path.join(rootPath, "deps"));

    this.cache.lastBuilt = new Date();
    this.outputChannel.appendLine(
      `Cache built with ${this.cache.modules.size} modules`
    );
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
      this.outputChannel.appendLine(
        `Error scanning directory ${dirPath}: ${error}`
      );
    }
  }

  private async scanFile(filePath: string): Promise<void> {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      const matches = Array.from(content.matchAll(this.moduleRegex));

      for (const match of matches) {
        const fullModuleName = match[1];
        const shortModuleName = this.extractShortName(fullModuleName);

        const mapping = this.cache.modules.get(shortModuleName) || [];
        if (!mapping.includes(fullModuleName)) {
          mapping.push(fullModuleName);
        }
        this.cache.modules.set(shortModuleName, mapping);
      }
    } catch (error) {
      this.outputChannel.appendLine(
        `Error scanning file ${filePath}: ${error}`
      );
    }
  }

  private extractShortName(fullModuleName: string): string {
    const parts = fullModuleName.split(".");
    return parts[parts.length - 1];
  }

  public findAllModulesByShortName(shortName: string): string[] {
    return this.cache.modules.get(shortName) || [];
  }

  public getAllModules(): Map<string, string[]> {
    return new Map(this.cache.modules);
  }

  public getCacheInfo(): { size: number; lastBuilt: Date } {
    return {
      size: this.cache.modules.size,
      lastBuilt: this.cache.lastBuilt,
    };
  }
}
