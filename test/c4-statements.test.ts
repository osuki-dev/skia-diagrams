import { expect, test } from "bun:test";
import { c4Statements } from "../src/parse/c4-statements.ts";
import { ParseFailure } from "../src/parse/common.ts";

test("C4 statements retain multiline calls and their original line numbers", () => {
  expect(
    c4Statements(`C4Context
%% A native scanner preserves source coordinates.
Person(
  user,
  "Account holder",
  "Description with (parentheses), a comma; and {braces}"
)
Rel(user, system, "Uses")`),
  ).toEqual([
    { text: "C4Context", line: 1 },
    {
      text: 'Person(\n  user,\n  "Account holder",\n  "Description with (parentheses), a comma; and {braces}"\n)',
      line: 3,
    },
    { text: 'Rel(user, system, "Uses")', line: 8 },
  ]);
});

test("C4 statements separate inline boundaries, adjacent calls, and semicolons", () => {
  expect(
    c4Statements(
      'C4Context\nSystem_Boundary(s, "System") { Person(a, "A"); SystemDb(b, "B") } Rel(a,b,"Uses")',
    ),
  ).toEqual([
    { text: "C4Context", line: 1 },
    { text: 'System_Boundary(s, "System") {', line: 2 },
    { text: 'Person(a, "A")', line: 2 },
    { text: 'SystemDb(b, "B")', line: 2 },
    { text: "}", line: 2 },
    { text: 'Rel(a,b,"Uses")', line: 2 },
  ]);
});

test("a boundary opening brace can follow comments and blank lines", () => {
  expect(
    c4Statements('C4Context\nBoundary(s, "System")\n%% documentation\n\n{\nPerson(a,"A")\n}'),
  ).toEqual([
    { text: "C4Context", line: 1 },
    { text: 'Boundary(s, "System"){', line: 2 },
    { text: 'Person(a,"A")', line: 6 },
    { text: "}", line: 7 },
  ]);
});

test("escaped quotes and backslashes do not terminate argument labels", () => {
  const call = String.raw`Person(a, "A \\"quoted\\" label", "C:\\path; {kept}")`;
  expect(c4Statements(call)).toEqual([{ text: call, line: 1 }]);
  expect(c4Statements('Person(a,"A %% label") %% actual comment\nSystem(b,"B")')).toEqual([
    { text: 'Person(a,"A %% label")', line: 1 },
    { text: 'System(b,"B")', line: 2 },
  ]);
});

test("malformed C4 calls report the originating source line", () => {
  for (const source of ['\n\nPerson(a, "Unclosed)', '\n\nPerson(a, "A"']) {
    try {
      c4Statements(source);
      throw new Error("Expected a C4 parse failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ParseFailure);
      expect((error as ParseFailure).detail.line).toBe(3);
    }
  }
  expect(() => c4Statements("C4Context\n)")).toThrow("Unexpected C4 closing parenthesis");
});
