import * as vscode from "vscode";

type ModuleDefinitionRange = {
  type: "defmodule" | "other";
  line: number;
  moduleIndex: number;
};

export class AliasInsertionService {
  public async insertAlias(fullModuleName: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return false;
    }

    const document = editor.document;

    if (this.aliasExists(document, fullModuleName)) {
      vscode.window.showInformationMessage(
        `Alias for ${fullModuleName} already exists`
      );
      return false;
    }

    const defmoduleLineNumber = await this.findDefmoduleLine(document);
    if (defmoduleLineNumber === -1) {
      vscode.window.showErrorMessage(
        "Could not find defmodule in current file"
      );
      return false;
    }

    // Insert alias after defmodule line
    const insertPosition = new vscode.Position(defmoduleLineNumber + 1, 0);
    const aliasText = `  alias ${fullModuleName}\n`;

    await editor.edit((editBuilder) => {
      editBuilder.insert(insertPosition, aliasText);
    });

    vscode.window.showInformationMessage(`Added alias for ${fullModuleName}`);
    return true;
  }

  private aliasExists(
    document: vscode.TextDocument,
    fullModuleName: string
  ): boolean {
    const text = document.getText();
    const aliasPattern = new RegExp(
      `alias\\s+${this.escapeRegExp(fullModuleName)}(?:\\s|$|,)`,
      "gm"
    );
    return aliasPattern.test(text);
  }

  private async findDefmoduleLine(
    document: vscode.TextDocument
  ): Promise<number> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return -1;
    }

    const currentLine = editor.selection.active.line;

    try {
      const modules = await this.getModulesFromElixir(document.fileName);

      // Find the innermost module that contains the cursor (convert to 0-based indexing)
      let innermostModule: { start: number; end: number } | null = null;

      for (const module of modules) {
        const startLine = module.start - 1; // Convert to 0-based
        const endLine = module.end - 1; // Convert to 0-based

        if (currentLine >= startLine && currentLine <= endLine) {
          // If this is the first module we found, or if this module is more nested
          if (!innermostModule || startLine > innermostModule.start) {
            innermostModule = { start: startLine, end: endLine };
          }
        }
      }

      return innermostModule ? innermostModule.start : -1;
    } catch (error) {
      vscode.window.showErrorMessage(`Error parsing Elixir modules: ${error}`);
      return -1;
    }
  }

  private async getModulesFromElixir(
    filePath: string
  ): Promise<Array<{ name: string; start: number; end: number }>> {
    const { execFile } = require("child_process");
    const path = require("path");

    return new Promise((resolve, reject) => {
      // __dirname points to 'out/', we need to go to the extension root and then to 'src/'
      const scriptPath = path.join(__dirname, "..", "src", "module_finder.exs");

      execFile(
        "elixir",
        [scriptPath, filePath],
        (error: any, stdout: string, stderr: string) => {
          if (error) {
            reject(`Elixir execution error: ${error.message}`);
            return;
          }

          if (stderr) {
            reject(`Elixir stderr: ${stderr}`);
            return;
          }

          try {
            const modules = JSON.parse(stdout.trim());
            resolve(modules);
          } catch (parseError) {
            reject(`JSON parse error: ${parseError}`);
          }
        }
      );
    });
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  public getSelectedText(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return undefined;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      const wordRange = editor.document.getWordRangeAtPosition(
        selection.active
      );
      if (!wordRange) {
        return undefined;
      }
      return editor.document.getText(wordRange);
    }

    return editor.document.getText(selection);
  }
}
