import * as vscode from "vscode";

export class AliasInsertionService {
  public async insertAlias(fullModuleName: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return false;
    }

    const document = editor.document;
    const text = document.getText();

    if (aliasExists(text, fullModuleName)) {
      vscode.window.showInformationMessage(
        `Alias for ${fullModuleName} already exists`,
      );
      return false;
    }

    const cursorLine = editor.selection.active.line;
    const lines = text.split("\n");
    const defmoduleLineNumber = findInnermostModuleLine(lines, cursorLine);

    let insertPosition;
    let aliasText;

    if (defmoduleLineNumber === -1) {
      // No defmodule found, insert at the top of the file
      insertPosition = new vscode.Position(0, 0);
      aliasText = `alias ${fullModuleName}\n`;
    } else {
      // Insert alias after defmodule line, matching its indentation level
      insertPosition = new vscode.Position(defmoduleLineNumber + 1, 0);
      const baseIndent = lines[defmoduleLineNumber].match(/^(\s*)/)?.[1] ?? "";
      aliasText = `${baseIndent}  alias ${fullModuleName}\n`;
    }

    await editor.edit((editBuilder) => {
      editBuilder.insert(insertPosition, aliasText);
    });

    vscode.window.showInformationMessage(`Added alias for ${fullModuleName}`);
    return true;
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

function aliasExists(text: string, fullModuleName: string): boolean {
  const aliasPattern = new RegExp(
    `alias\\s+${escapeRegExp(fullModuleName)}(?:\\s|$|,)`,
    "gm",
  );
  return aliasPattern.test(text);
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the start line of the innermost defmodule enclosing cursorLine,
 * or -1 if the cursor is not inside any defmodule.
 *
 * Scans only up to cursorLine (O(cursorLine)), relying on the indentation
 * stack to track which modules are still open at the cursor position.
 *
 * Exported for unit testing.
 */
export function findInnermostModuleLine(
  lines: string[],
  cursorLine: number,
): number {
  const stack: Array<{ line: number; indent: number }> = [];
  const limit = Math.min(cursorLine, lines.length - 1);

  for (let i = 0; i <= limit; i++) {
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
        stack.pop();
      }
    }
  }

  // The top of the stack is the innermost still-open module at the cursor
  return stack.length > 0 ? stack[stack.length - 1].line : -1;
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
