import * as assert from "assert";
import { findModulesInLines, findInnermostModuleLine } from "../aliasInsertion";

suite("findModulesInLines", () => {
  test("returns empty array for empty file", () => {
    assert.deepStrictEqual(findModulesInLines([]), []);
  });

  test("returns empty array when no defmodule present", () => {
    const lines = ["def foo do", "  :bar", "end"];
    assert.deepStrictEqual(findModulesInLines(lines), []);
  });

  test("finds a single top-level module", () => {
    const lines = [
      "defmodule MyApp do", // 0
      "  def foo, do: :bar", // 1
      "end", // 2
    ];
    assert.deepStrictEqual(findModulesInLines(lines), [{ start: 0, end: 2 }]);
  });

  test("finds two sibling top-level modules", () => {
    const lines = [
      "defmodule Foo do", // 0
      "end", // 1
      "", // 2
      "defmodule Bar do", // 3
      "end", // 4
    ];
    assert.deepStrictEqual(findModulesInLines(lines), [
      { start: 0, end: 1 },
      { start: 3, end: 4 },
    ]);
  });

  test("finds nested modules", () => {
    const lines = [
      "defmodule Outer do", // 0
      "  defmodule Inner do", // 1
      "    :ok", // 2
      "  end", // 3
      "end", // 4
    ];
    // Inner is closed first, then Outer
    assert.deepStrictEqual(findModulesInLines(lines), [
      { start: 1, end: 3 },
      { start: 0, end: 4 },
    ]);
  });

  test("ignores non-module do/end blocks", () => {
    const lines = [
      "defmodule MyApp do", // 0
      "  def foo do", // 1
      "    if true do", // 2
      "      :ok", // 3
      "    end", // 4
      "  end", // 5
      "end", // 6
    ];
    assert.deepStrictEqual(findModulesInLines(lines), [{ start: 0, end: 6 }]);
  });

  test("ignores comment lines", () => {
    const lines = [
      "# defmodule Fake do", // 0 — comment, should be ignored
      "defmodule Real do", // 1
      "end", // 2
    ];
    assert.deepStrictEqual(findModulesInLines(lines), [{ start: 1, end: 2 }]);
  });

  test("handles deeply nested modules", () => {
    const lines = [
      "defmodule A do", // 0
      "  defmodule B do", // 1
      "    defmodule C do", // 2
      "      :ok", // 3
      "    end", // 4
      "  end", // 5
      "end", // 6
    ];
    assert.deepStrictEqual(findModulesInLines(lines), [
      { start: 2, end: 4 },
      { start: 1, end: 5 },
      { start: 0, end: 6 },
    ]);
  });

  test("handles unclosed module (cursor past EOF)", () => {
    const lines = [
      "defmodule Foo do", // 0
      "  :bar", // 1
      // missing end
    ];
    assert.deepStrictEqual(findModulesInLines(lines), [{ start: 0, end: 1 }]);
  });
});

suite("findInnermostModuleLine", () => {
  test("cursor in top-level module body → returns that module", () => {
    const lines = [
      "defmodule Outer do", // 0
      "  :ok", // 1  ← cursor
      "end", // 2
    ];
    assert.strictEqual(findInnermostModuleLine(lines, 1), 0);
  });

  test("cursor inside nested module → returns inner module, not outer", () => {
    const lines = [
      "defmodule Outer do", // 0
      "  defmodule Inner do", // 1
      "    :ok", // 2  ← cursor
      "  end", // 3
      "end", // 4
    ];
    assert.strictEqual(findInnermostModuleLine(lines, 2), 1);
  });

  test("cursor after nested module but still inside outer → returns outer", () => {
    // This is the bug scenario: cursor is inside Outer but AFTER Inner has ended.
    const lines = [
      "defmodule Outer do", // 0
      "  defmodule Inner do", // 1
      "    :ok", // 2
      "  end", // 3
      "  :after_inner", // 4  ← cursor (inside Outer, after Inner)
      "end", // 5
    ];
    assert.strictEqual(findInnermostModuleLine(lines, 4), 0);
  });

  test("cursor outside all modules → returns -1", () => {
    const lines = [
      "defmodule Foo do", // 0
      "end", // 1
      ":standalone", // 2  ← cursor
    ];
    assert.strictEqual(findInnermostModuleLine(lines, 2), -1);
  });

  test("cursor on the defmodule line itself → returns that module", () => {
    const lines = [
      "defmodule Foo do", // 0  ← cursor
      "  :ok", // 1
      "end", // 2
    ];
    assert.strictEqual(findInnermostModuleLine(lines, 0), 0);
  });

  test("cursor on the end line → returns that module", () => {
    const lines = [
      "defmodule Foo do", // 0
      "  :ok", // 1
      "end", // 2  ← cursor
    ];
    assert.strictEqual(findInnermostModuleLine(lines, 2), 0);
  });

  test("two sibling modules – cursor in first", () => {
    const lines = [
      "defmodule Foo do", // 0
      "  :ok", // 1  ← cursor
      "end", // 2
      "defmodule Bar do", // 3
      "end", // 4
    ];
    assert.strictEqual(findInnermostModuleLine(lines, 1), 0);
  });

  test("two sibling modules – cursor in second", () => {
    const lines = [
      "defmodule Foo do", // 0
      "end", // 1
      "defmodule Bar do", // 2
      "  :ok", // 3  ← cursor
      "end", // 4
    ];
    assert.strictEqual(findInnermostModuleLine(lines, 3), 2);
  });
});
