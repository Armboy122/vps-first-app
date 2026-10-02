export interface StoredImportBatch {
    payloadHash: string;
    createdById: number;
    requestIds: number[];
}
export class ImportBatchError extends Error {
}
export interface IdempotentBatchTransaction<TInput, TItem> {
    createBatch(input: {
        idempotencyKey: string;
        payloadHash: string;
        createdById: number;
    }): Promise<{
        id: number;
    }>;
    createItems(items: TInput[]): Promise<TItem[]>;
    updateBatchRequestIds(batchId: number, requestIds: number[]): Promise<void>;
}
export interface IdempotentBatchStore<TInput, TItem> {
    findBatch(idempotencyKey: string): Promise<StoredImportBatch | null>;
    loadItems(ids: number[]): Promise<TItem[]>;
    transaction<R>(work: (transaction: IdempotentBatchTransaction<TInput, TItem>) => Promise<R>): Promise<R>;
}
function isKeyCollision(error: unknown): boolean {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002")
        return false;
    const target = (error as {
        meta?: {
            target?: unknown;
        };
    }).meta?.target;
    return Array.isArray(target) ? target.length === 1 && target[0] === "idempotencyKey"
        : target === "OutageRequestImport_idempotencyKey_key";
}
function assertCompleteIds(ids: number[], expected: number): void {
    if (!Array.isArray(ids) || ids.length !== expected || new Set(ids).size !== expected ||
        ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
        throw new ImportBatchError("Previously created outage-request batch is incomplete or corrupt");
    }
}
/** Input array order is significant. Results are stably ordered by saved IDs. */
export async function runIdempotentBatch<TInput, TItem extends {
    id: number;
}>(input: {
    idempotencyKey: string;
    payloadHash: string;
    createdById: number;
}, itemsToCreate: TInput[], store: IdempotentBatchStore<TInput, TItem>, beforeCreate: () => Promise<void>): Promise<TItem[]> {
    if (!itemsToCreate.length)
        throw new ImportBatchError("Cannot create an empty outage-request batch");
    const resolveExisting = async (batch: StoredImportBatch): Promise<TItem[]> => {
        if (batch.payloadHash !== input.payloadHash || batch.createdById !== input.createdById) {
            throw new ImportBatchError("Idempotency key is already associated with a different outage-request batch or actor");
        }
        assertCompleteIds(batch.requestIds, itemsToCreate.length);
        const items = await store.loadItems(batch.requestIds);
        assertCompleteIds(items.map((item) => item.id), itemsToCreate.length);
        const byId = new Map(items.map((item) => [item.id, item]));
        if (batch.requestIds.some((id) => !byId.has(id))) {
            throw new ImportBatchError("Previously created outage-request batch is incomplete");
        }
        return batch.requestIds.map((id) => byId.get(id)!);
    };
    const existing = await store.findBatch(input.idempotencyKey);
    if (existing)
        return resolveExisting(existing);
    await beforeCreate();
    // Only a collision at the ledger insert may resolve as a concurrent retry.
    // A unique constraint on outage rows or a later operation must propagate.
    let keyCollision = false;
    try {
        return await store.transaction(async (transaction) => {
            let batch: {
                id: number;
            };
            try {
                batch = await transaction.createBatch(input);
            }
            catch (error) {
                keyCollision = isKeyCollision(error);
                throw error;
            }
            const items = await transaction.createItems(itemsToCreate);
            assertCompleteIds(items.map((item) => item.id), itemsToCreate.length);
            const ordered = [...items].sort((a, b) => a.id - b.id);
            await transaction.updateBatchRequestIds(batch.id, ordered.map((item) => item.id));
            return ordered;
        });
    }
    catch (error) {
        if (keyCollision) {
            const winner = await store.findBatch(input.idempotencyKey);
            if (winner)
                return resolveExisting(winner);
        }
        throw error;
    }
}
