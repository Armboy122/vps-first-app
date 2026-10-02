export type CsvRecord = { values: string[]; physicalRow: number };

/** RFC 4180-style CSV reader. It preserves quoted commas/newlines and escaped quotes. */
export function parseCsvDocument(text: string): CsvRecord[] {
  const input = text.replace(/^\uFEFF/, "");
  const records: CsvRecord[] = [];
  let values: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;
  let row = 1;
  let recordStart = 1;
  let endedRecord = false;

  const pushRecord = () => {
    values.push(field);
    records.push({ values, physicalRow: recordStart });
    values = [];
    field = "";
    endedRecord = true;
    closedQuote = false;
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += char;
        if (char === "\n" || (char === "\r" && input[i + 1] !== "\n")) row++;
      }
      continue;
    }

    if (closedQuote && char !== "," && char !== "\r" && char !== "\n") {
      if (/\s/.test(char)) continue;
      throw new Error(`Unexpected character after quoted field at row ${row}`);
    }

    if (char === '"') {
      if (field.length > 0) throw new Error(`Unexpected quote at row ${row}`);
      quoted = true;
      closedQuote = false;
      endedRecord = false;
    } else if (char === ",") {
      values.push(field);
      field = "";
      closedQuote = false;
      endedRecord = false;
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      pushRecord();
      row++;
      recordStart = row;
    } else {
      field += char;
      if (!/\s/.test(char)) endedRecord = false;
    }
  }
  if (quoted) throw new Error(`Unclosed quoted field beginning before row ${row}`);
  if (field.length > 0 || values.length > 0 || !endedRecord) pushRecord();
  return records.filter((record) => record.values.some((value) => value.trim() !== ""));
}

export function decodeUtf8Csv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("CSV ต้องเข้ารหัส UTF-8 กรุณาบันทึกไฟล์ใหม่เป็น UTF-8 เพื่อป้องกันข้อความเสียหาย");
  }
}

export function assertCsvHeader(
  actual: string[],
  acceptedHeaders: string[][],
): void {
  const normalize = (value: string) => value.trim().replace(/^\uFEFF/, "").toLocaleLowerCase();
  const normalized = actual.map(normalize);
  if (acceptedHeaders.some((candidate) =>
    candidate.length === normalized.length &&
    candidate.map(normalize).every((value, index) => value === normalized[index])
  )) return;
  throw new Error(`CSV header does not match the required columns: ${acceptedHeaders[0].join(",")}`);
}
