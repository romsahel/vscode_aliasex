import * as vscode from "vscode";

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

    const defmoduleLineNumber = this.findDefmoduleLine(document);
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

  private findDefmoduleLine(document: vscode.TextDocument): number {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return -1;
    }

    const currentLine = editor.selection.active.line;
    const textBeforeCursor = document.getText(
      new vscode.Range(0, 0, currentLine, 0)
    );

    const defmoduleRegex = /^\s*defmodule\s+.*\s+do/gm;
    const defmoduleLines: number[] = [];

    let match;
    while ((match = defmoduleRegex.exec(textBeforeCursor)) !== null) {
      const lineNumber =
        textBeforeCursor.substring(0, match.index).split("\n").length - 1;
      defmoduleLines.push(lineNumber);
    }

    // Return the last (closest) defmodule found before cursor
    return defmoduleLines[defmoduleLines.length - 1];
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
      return undefined;
    }

    return editor.document.getText(selection);
  }
}
