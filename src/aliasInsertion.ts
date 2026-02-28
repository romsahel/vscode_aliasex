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
        `Alias for ${fullModuleName} already exists`,
      );
      return false;
    }

    const defmoduleLineNumber = this.findDefmoduleLine(document);

    let insertPosition;
    let aliasText;

    if (defmoduleLineNumber === -1) {
      // No defmodule found, insert at the top of the file
      insertPosition = new vscode.Position(0, 0);
      aliasText = `alias ${fullModuleName}\n`;
    } else {
      // Insert alias after defmodule line, matching its indentation level
      insertPosition = new vscode.Position(defmoduleLineNumber + 1, 0);
      const defmoduleLineText = document.lineAt(defmoduleLineNumber).text;
      const baseIndent = defmoduleLineText.match(/^(\s*)/)?.[1] ?? "";
      aliasText = `${baseIndent}  alias ${fullModuleName}\n`;
    }

    await editor.edit((editBuilder) => {
      editBuilder.insert(insertPosition, aliasText);
    });

    vscode.window.showInformationMessage(`Added alias for ${fullModuleName}`);
    return true;
  }

  private aliasExists(
    document: vscode.TextDocument,
    fullModuleName: string,
  ): boolean {
    const text = document.getText();
    const aliasPattern = new RegExp(
      `alias\\s+${this.escapeRegExp(fullModuleName)}(?:\\s|$|,)`,
      "gm",
    );
    return aliasPattern.test(text);
  }

  private findDefmoduleLine(document: vscode.TextDocument): number {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return -1;
    }

    const cursorLine = editor.selection.active.line;
    const lines = Array.from({ length: document.lineCount }, (_, i) =>
      document.lineAt(i).text,
    );
    const modules = findModulesInLines(lines);

    let innermostStart = -1;
    for (const m of modules) {
      if (cursorLine >= m.start && cursorLine <= m.end) {
        if (m.start > innermostStart) {
          innermostStart = m.start;
        }
      }
    }

    return innermostStart;
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
        selection.active,
      );
      if (!wordRange) {
        return undefined;
      }
      return editor.document.getText(wordRange);
    }

    return editor.document.getText(selection);
  }
}

/**
 * Finds all defmodule ranges in the given lines using an indentation-based
 * stack. Each defmodule is paired with the first `end` at the same indentation
 * level that follows it.
 *
 * Exported for unit testing.
 */
export function findModulesInLines(
  lines: string[],
): Array<{ start: number; end: number }> {
  const modules: Array<{ start: number; end: number }> = [];
  const stack: Array<{ line: number; indent: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    const trimmed = text.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const indent = text.length - text.trimStart().length;

    if (/^defmodule\s+/.test(trimmed)) {
      stack.push({ line: i, indent });
    } else if (trimmed === "end" && stack.length > 0) {
      if (indent === stack[stack.length - 1].indent) {
        const top = stack.pop()!;
        modules.push({ start: top.line, end: i });
      }
    }
  }

  // Flush any unclosed modules (e.g. cursor is past the last `end`)
  for (const item of stack) {
    modules.push({ start: item.line, end: lines.length - 1 });
  }

  return modules;
}
