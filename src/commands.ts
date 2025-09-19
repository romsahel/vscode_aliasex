import * as vscode from "vscode";
import { ModuleDiscoveryService } from "./moduleDiscovery";
import { AliasInsertionService } from "./aliasInsertion";

export class CommandService {
  private moduleDiscovery: ModuleDiscoveryService;
  private aliasInsertion: AliasInsertionService;

  constructor(
    moduleDiscovery: ModuleDiscoveryService,
    aliasInsertion: AliasInsertionService
  ) {
    this.moduleDiscovery = moduleDiscovery;
    this.aliasInsertion = aliasInsertion;
  }

  public async addAlias(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "elixir") {
        vscode.window.showErrorMessage(
          "This command only works in Elixir files"
        );
        return;
      }

      const selectedText = this.aliasInsertion.getSelectedText();
      if (!selectedText) {
        vscode.window.showErrorMessage("Please select a module name first");
        return;
      }

      const moduleName = this.cleanModuleName(selectedText);
      if (!moduleName) {
        vscode.window.showErrorMessage("Invalid module name selected");
        return;
      }

      const allMatches =
        this.moduleDiscovery.findAllModulesByShortName(moduleName);
      if (allMatches.length === 0) {
        vscode.window.showErrorMessage(
          `Module '${moduleName}' not found in cache. Try refreshing the cache.`
        );
        return;
      }

      let fullModuleName: string;
      if (allMatches.length === 1) {
        // Single match - use it directly
        fullModuleName = allMatches[0];
      } else {
        // Multiple matches - show picker
        const selected = await this.showModulePicker(allMatches, moduleName);
        if (!selected) {
          // User cancelled picker
          return;
        }
        fullModuleName = selected;
      }

      await this.aliasInsertion.insertAlias(fullModuleName);
    } catch (error) {
      console.error("Error adding alias:", error);
      vscode.window.showErrorMessage(`Error adding alias: ${error}`);
    }
  }

  public async refreshCache(): Promise<void> {
    try {
      vscode.window.showInformationMessage("Refreshing module cache...");
      await this.moduleDiscovery.buildCache();

      const cacheInfo = this.moduleDiscovery.getCacheInfo();
      vscode.window.showInformationMessage(
        `Cache refreshed! Found ${cacheInfo.size} modules.`
      );
    } catch (error) {
      console.error("Error refreshing cache:", error);
      vscode.window.showErrorMessage(`Error refreshing cache: ${error}`);
    }
  }

  private cleanModuleName(text: string): string | undefined {
    // Remove any trailing function calls, dots, or whitespace
    const cleaned = text.trim().replace(/\.[a-z_][a-zA-Z0-9_]*.*$/, "");

    // Check if it looks like a valid module name (starts with uppercase)
    if (/^[A-Z][A-Za-z0-9_.]*$/.test(cleaned)) {
      return cleaned;
    }

    return undefined;
  }

  private async showModulePicker(
    modules: string[],
    shortName: string
  ): Promise<string | undefined> {
    const items: vscode.QuickPickItem[] = modules.map((fullModule) => ({
      label: fullModule,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Multiple modules found for "${shortName}". Select one:`,
    });

    return selected?.label;
  }
}
