import { isValidISODateKey } from "./date.utils";
/** Excel's 1900 leap-day bug is rejected, never normalized to another date. */
export function excelSerialToDateKey(serial: number, date1904 = false): string | null {
    if (!Number.isFinite(serial))
        return null;
    const days = Math.floor(serial);
    if (days < (date1904 ? 0 : 1) || days > 2958465 || (!date1904 && days === 60))
        return null;
    const epoch = Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 31);
    const date = new Date(epoch + (days - (!date1904 && days > 60 ? 1 : 0)) * 86400000);
    const key = date.toISOString().slice(0, 10);
    return isValidISODateKey(key) ? key : null;
}
/** Convert Buddhist years before validating leap days in the Gregorian year. */
export function parseImportDateKey(value: string): string | null {
    const text = value?.trim();
    if (!text)
        return null;
    if (/^\d+(?:\.\d+)?$/.test(text))
        return excelSerialToDateKey(Number(text));
    let match = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(text);
    let year: number, month: number, day: number;
    if (match && (text[4] === text[7])) {
        [, year, month, day] = match.map(Number);
    }
    else {
        match = /^(\d{2})([-/])(\d{2})\2(\d{4})$/.exec(text);
        if (!match)
            return null;
        day = Number(match[1]);
        month = Number(match[3]);
        year = Number(match[4]);
    }
    if (year > 2400)
        year -= 543;
    const key = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return isValidISODateKey(key) ? key : null;
}
export function formatImportTime(value: string): string {
    const text = value?.trim();
    if (!text)
        return "";
    let hours: number, minutes: number;
    let match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);
    if (match) {
        if (match[3] !== undefined && Number(match[3]) > 59)
            return "";
        hours = Number(match[1]);
        minutes = Number(match[2]);
    }
    else if (/^0?\.\d+$/.test(text)) {
        const fraction = Number(text);
        if (fraction <= 0 || fraction >= 1)
            return "";
        const total = Math.round(fraction * 1440);
        hours = Math.floor(total / 60);
        minutes = total % 60;
    }
    else if (/^\d{3,4}$/.test(text)) {
        hours = Number(text.slice(0, -2));
        minutes = Number(text.slice(-2));
    }
    else {
        match = /^(\d{1,2})\.(\d{1,2})$/.exec(text);
        if (!match)
            return "";
        hours = Number(match[1]);
        minutes = Number(match[2]);
    }
    if (hours > 23 || minutes > 59)
        return "";
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
