import * as vscode from "vscode";
import { ModuleDiscoveryService } from "./moduleDiscovery";
import { AliasInsertionService } from "./aliasInsertion";
import { CommandService } from "./commands";

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel("Elixir Alias Helper");
  outputChannel.appendLine("aliasex is now active!");

  // Initialize services
  const moduleDiscovery = new ModuleDiscoveryService();
  const aliasInsertion = new AliasInsertionService();
  const commandService = new CommandService(moduleDiscovery, aliasInsertion);

  // Build initial cache
  moduleDiscovery.buildCache();

  // Register commands
  const addAliasCommand = vscode.commands.registerCommand(
    "aliasex.addAlias",
    async () => {
      await commandService.addAlias();
    }
  );

  const refreshCacheCommand = vscode.commands.registerCommand(
    "aliasex.refreshCache",
    async () => {
      await commandService.refreshCache();
    }
  );

  // Add to subscriptions
  context.subscriptions.push(
    addAliasCommand,
    refreshCacheCommand,
    outputChannel
  );
}

export function getOutputChannel(): vscode.OutputChannel {
  return outputChannel;
}

// This method is called when your extension is deactivated
export function deactivate() {}
