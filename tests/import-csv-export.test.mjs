import test from "node:test";
import assert from "node:assert/strict";
import { generateCSVContent } from "../app/admin/utils/csvParser.ts";
import { parseCsvDocument } from "../lib/utils/csvDocument.ts";

function roundTripRows(data, headers) {
  return parseCsvDocument(generateCSVContent(data, headers)).map(({ values }) => values);
}

const singleCellCases = [
  ["Thai text", "หมายเลขหม้อแปลง", "หมายเลขหม้อแปลง"],
  ["comma", "Bangkok, North", "Bangkok, North"],
  ["quote without comma", 'a "quoted" value', 'a "quoted" value'],
  ["embedded LF", "first line\nsecond line", "first line\nsecond line"],
  ["embedded CR", "first line\rsecond line", "first line\rsecond line"],
  ["embedded CRLF", "first line\r\nsecond line", "first line\r\nsecond line"],
  [
    "comma, quote, and line endings",
    'comma, then "quote"\nLF\rCR\r\nCRLF',
    'comma, then "quote"\nLF\rCR\r\nCRLF',
  ],
  ["empty string", "", ""],
  ["null", null, ""],
  ["undefined", undefined, ""],
  ["zero", 0, "0"],
  ["false", false, "false"],
];

for (const [label, input, expected] of singleCellCases) {
  test(`CSV export round-trips ${label}`, () => {
    const rows = roundTripRows([{ label, value: input }], ["label", "value"]);
    assert.deepEqual(rows, [
      ["label", "value"],
      [label, expected],
    ]);
  });
}

test("CSV export escapes headers containing commas, quotes, and line endings", () => {
  const headers = ["column, one", 'column "two"', "column\nthree", "column\r\nfour"];
  const row = {
    [headers[0]]: "comma header",
    [headers[1]]: "quote header",
    [headers[2]]: "LF header",
    [headers[3]]: "CRLF header",
  };

  assert.deepEqual(roundTripRows([row], headers), [
    headers,
    ["comma header", "quote header", "LF header", "CRLF header"],
  ]);
});

test("CSV export preserves row order across ordinary and multiline records", () => {
  const rows = [
    { id: "first", value: "plain" },
    { id: "second", value: "Thai: สวัสดี" },
    { id: "third", value: 'comma, and "quote"' },
    { id: "fourth", value: "first line\nsecond line" },
    { id: "fifth", value: "" },
    { id: "sixth", value: 0 },
    { id: "seventh", value: false },
  ];

  assert.deepEqual(roundTripRows(rows, ["id", "value"]), [
    ["id", "value"],
    ["first", "plain"],
    ["second", "Thai: สวัสดี"],
    ["third", 'comma, and "quote"'],
    ["fourth", "first line\nsecond line"],
    ["fifth", ""],
    ["sixth", "0"],
    ["seventh", "false"],
  ]);
});
