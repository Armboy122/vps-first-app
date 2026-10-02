/** Deduplicate before chunking, with the same case-sensitive identity as PostgreSQL. */
export function deduplicateTransformerRows<T extends {
    transformerNumber: string;
    physicalRow: number;
}>(rows: T[]): {
    uniqueRows: T[];
    duplicates: Array<{
        transformerNumber: string;
        physicalRow: number;
        firstPhysicalRow: number;
    }>;
} {
    const seen = new Map<string, number>();
    const uniqueRows: T[] = [];
    const duplicates: Array<{
        transformerNumber: string;
        physicalRow: number;
        firstPhysicalRow: number;
    }> = [];
    for (const row of rows) {
        const transformerNumber = row.transformerNumber.trim();
        const firstPhysicalRow = seen.get(transformerNumber);
        if (firstPhysicalRow !== undefined)
            duplicates.push({ transformerNumber, physicalRow: row.physicalRow, firstPhysicalRow });
        else {
            seen.set(transformerNumber, row.physicalRow);
            uniqueRows.push({ ...row, transformerNumber });
        }
    }
    return { uniqueRows, duplicates };
}
