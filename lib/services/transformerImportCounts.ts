/** Fail within the transaction if RETURNING does not account for every unique row. */
export function assertTransformerUpsertCounts(result: unknown, expected: number): {
    created: number;
    updated: number;
} {
    if (!Array.isArray(result) || result.length !== 1 || !result[0] || typeof result[0] !== "object")
        throw new Error("Transformer upsert returned no valid count result");
    const { created_count: rawCreated, updated_count: rawUpdated } = result[0];
    if (![rawCreated, rawUpdated].every((value) => typeof value === "number" || typeof value === "bigint"))
        throw new Error("Transformer upsert returned malformed counts");
    const created = Number(rawCreated), updated = Number(rawUpdated);
    if (!Number.isSafeInteger(created) || !Number.isSafeInteger(updated) || created < 0 || updated < 0 || created + updated !== expected)
        throw new Error("Transformer upsert counts do not match the unique batch size");
    return { created, updated };
}
