import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as preparation from '../scripts/prepare-preview.ts';
import * as boundary from '../lib/server/config/previewBoundary.ts';

const direct = 'postgresql://synthetic:private-database-password@ep-odd-paper-azxfykgo.c-3.ap-southeast-1.aws.neon.tech/vps_tr_mock?sslmode=require';
const env = {
    APP_ENV: 'preview', VERCEL_ENV: 'preview', DATABASE_URL: direct, DIRECT_URL: direct,
    PREVIEW_PREPARE_ONCE: preparation.PREVIEW_PREPARE_CONFIRMATION,
    PREVIEW_ADMIN_PASSWORD: 'private-synthetic-admin-password-for-tests',
};
const privateError = (code) => Object.assign(new Error(`${direct} ${env.PREVIEW_ADMIN_PASSWORD} raw subprocess output`), { code });
function ports() {
    const client = {
        user: { async findUnique() { return null; }, async create() {} },
        workCenter: { async findUnique() { return { id: 2 }; } },
        branch: { async findUnique() { return { id: 5 }; } },
        async $disconnect() {},
    };
    const calls = [];
    return {
        client, calls,
        ports: {
            async migrate() { calls.push('migrate'); },
            async seed({ args }) { calls.push(args ? 'lookup-seed' : 'full-seed'); return {}; },
            async client() { calls.push('client'); return client; },
            async hashPassword() { return 'hash'; },
        },
    };
}
function diagnostic(error, stage, code) {
    const output = preparation.formatPreviewPreparationFailure(error);
    assert.equal(output, `Preview preparation failed safely (stage=${stage}; code=${code}). Credentials and subprocess output were omitted.`);
    for (const secret of [direct, env.PREVIEW_ADMIN_PASSWORD, 'private-database-password', 'raw subprocess output'])
        assert.ok(!output.includes(secret));
    assert.ok(!JSON.stringify(error).includes('private-'));
    assert.ok(!String(error).includes('private-'));
    return true;
}

test('each preview preparation guard reports a fixed safe diagnostic before side effects', async () => {
    const cases = [
        [{ APP_ENV: undefined }, 'validate-environment', 'APP_ENV_NOT_PREVIEW'],
        [{ VERCEL_ENV: 'production' }, 'validate-environment', 'VERCEL_ENV_NOT_PREVIEW'],
        [{ PREVIEW_PREPARE_ONCE: undefined }, 'validate-environment', 'PREPARE_CONFIRMATION_INVALID'],
        [{ DATABASE_URL: undefined }, 'validate-database', 'DB_URL_MISSING'],
        [{ DATABASE_URL: direct.replace('vps_tr_mock', 'production') }, 'validate-database', 'DB_NAME_REJECTED'],
        [{ DATABASE_URL: direct.replace('sslmode=require', 'sslmode=disable') }, 'validate-database', 'DB_TLS_INVALID'],
        [{ DIRECT_URL: undefined }, 'validate-direct', 'DB_URL_MISSING'],
        [{ DIRECT_URL: direct.replace('vps_tr_mock', 'production') }, 'validate-direct', 'DB_NAME_REJECTED'],
        [{ DIRECT_URL: direct.replace('azxfykgo.c-3', 'azxfykgo-pooler.c-3') }, 'validate-direct', 'DIRECT_ENDPOINT_REQUIRED'],
        [{ PREVIEW_ADMIN_PASSWORD: 'short' }, 'validate-password', 'ADMIN_PASSWORD_INVALID'],
    ];
    for (const [change, stage, code] of cases) {
        const h = ports();
        await assert.rejects(preparation.preparePreview({ ...env, ...change }, h.ports), (error) => diagnostic(error, stage, code));
        assert.deepEqual(h.calls, []);
    }
});

test('every execution stage reports only a recognized Prisma code and no error details', async () => {
    const cases = [
        ['migrate', (h) => { h.ports.migrate = async () => { throw privateError('P1001'); }; }],
        ['lookup-seed', (h) => { h.ports.seed = async () => { throw privateError('P1001'); }; }],
        ['admin-client', (h) => { h.ports.client = async () => { throw privateError('P1001'); }; }],
        ['admin-lookup', (h) => { h.client.user.findUnique = async () => { throw privateError('P1001'); }; }],
        ['admin-organization', (h) => { h.client.workCenter.findUnique = async () => { throw privateError('P1001'); }; }],
        ['admin-password', (h) => { h.ports.hashPassword = async () => { throw privateError('P1001'); }; }],
        ['admin-create', (h) => { h.client.user.create = async () => { throw privateError('P1001'); }; }],
        ['admin-disconnect', (h) => { h.client.$disconnect = async () => { throw privateError('P1001'); }; }],
        ['full-seed', (h) => { h.ports.seed = async ({ args }) => { if (!args) throw privateError('P1001'); return {}; }; }],
    ];
    for (const [stage, change] of cases) {
        const h = ports(); change(h);
        await assert.rejects(preparation.preparePreview(env, h.ports), (error) => diagnostic(error, stage, 'P1001'));
    }
});

test('unknown errors and unrecognized or embellished error codes remain generic', async () => {
    for (const code of ['P9999', 'P1001 private-database-password', 'ENOENT', undefined]) {
        const h = ports();
        h.ports.migrate = async () => { throw privateError(code); };
        await assert.rejects(preparation.preparePreview(env, h.ports), (error) => diagnostic(error, 'migrate', 'PREPARATION_FAILED'));
    }
    assert.equal(preparation.formatPreviewPreparationFailure(privateError('P1001')), 'Preview preparation failed safely (stage=unknown; code=PREPARATION_FAILED). Credentials and subprocess output were omitted.');
});

test('Prisma initialization errorCode is allowlisted without reading its message or meta', async () => {
    const h = ports();
    h.ports.client = async () => { throw { errorCode: 'P1012', get message() { throw new Error('message must not be read'); }, meta: { url: direct } }; };
    await assert.rejects(preparation.preparePreview(env, h.ports), (error) => diagnostic(error, 'admin-client', 'P1012'));
});

test('migration subprocess emits only recognized structured Prisma codes and never output', async () => {
    for (const [output, code] of [
        ['Error: P1001: raw subprocess output ' + direct, 'P1001'],
        ['\u001b[31mError: P3005\u001b[39m\nraw subprocess output ' + direct, 'P3005'],
        ['Prisma schema validation\nError code: P1012\n' + direct, 'P1012'],
        ['Error: P9999: ' + direct, 'MIGRATION_SUBPROCESS_FAILED'],
        ['unstructured ' + direct + ' P1001', 'MIGRATION_SUBPROCESS_FAILED'],
        ['Error: P1001secret', 'MIGRATION_SUBPROCESS_FAILED'],
    ]) {
        const h = ports();
        h.ports.migrate = async (url, inputEnv) => preparation.migratePreviewDatabase(url, inputEnv, (executable, args, options) => {
            assert.equal(executable, process.execPath);
            assert.deepEqual(args, ['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
            assert.equal(options.stdio, 'pipe');
            assert.equal(options.env.DATABASE_URL, direct);
            assert.ok(!args.join(' ').includes('private-'));
            return { status: 1, error: undefined, stdout: direct, stderr: output };
        });
        await assert.rejects(preparation.preparePreview(env, h.ports), (error) => diagnostic(error, 'migrate', code));
        assert.deepEqual(h.calls, []);
    }
});

test('migration launch errors and signals have fixed safe codes; success output is ignored', async () => {
    for (const [result, code] of [
        [{ status: null, error: privateError('ENOENT'), stderr: direct }, 'MIGRATION_LAUNCH_FAILED'],
        [{ status: null, signal: 'SIGTERM', stderr: direct }, 'MIGRATION_SUBPROCESS_FAILED'],
    ]) {
        const h = ports();
        h.ports.migrate = async (url, inputEnv) => preparation.migratePreviewDatabase(url, inputEnv, () => result);
        await assert.rejects(preparation.preparePreview(env, h.ports), (error) => diagnostic(error, 'migrate', code));
    }
    assert.doesNotThrow(() => preparation.migratePreviewDatabase(direct, env, () => ({ status: 0, stdout: direct, stderr: direct })));
});

test('failure during admin work survives a second disconnect failure', async () => {
    const h = ports();
    h.client.user.create = async () => { throw privateError('P2002'); };
    h.client.$disconnect = async () => { throw privateError('P1001'); };
    await assert.rejects(preparation.preparePreview(env, h.ports), (error) => diagnostic(error, 'admin-create', 'P2002'));
});


test('migration helper cannot bypass opt-in, target guards or the validated direct URL', () => {
    let subprocesses = 0;
    const run = () => { subprocesses++; return { status: 0 }; };
    for (const change of [{ VERCEL_ENV: 'production' }, { PREVIEW_PREPARE_ONCE: undefined }, { DATABASE_URL: direct.replace('vps_tr_mock', 'production') }, { DIRECT_URL: direct.replace('azxfykgo.c-3', 'azxfykgo-pooler.c-3') }])
        assert.throws(() => preparation.migratePreviewDatabase(direct, { ...env, ...change }, run));
    assert.throws(() => preparation.migratePreviewDatabase(direct.replace('vps_tr_mock', 'production'), env, run));
    assert.equal(subprocesses, 0);
});

test('CLI refuses an invalid opt-in with its safe diagnostic and no environment contents', () => {
    const result = spawnSync(process.execPath, ['--import', './tests/register-imports.mjs', '--experimental-strip-types', 'scripts/prepare-preview.ts'], {
        env: { ...env, PREVIEW_PREPARE_ONCE: 'not-enabled' }, encoding: 'utf8', stdio: 'pipe',
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /stage=validate-environment; code=PREPARE_CONFIRMATION_INVALID/);
    for (const secret of [direct, env.PREVIEW_ADMIN_PASSWORD, 'private-database-password'])
        assert.ok(!result.stderr.includes(secret));
});


const rejectedTargets = [
    [undefined, 'DB_URL_MISSING'],
    ['', 'DB_URL_MISSING'],
    ['private-invalid-url', 'DB_URL_INVALID'],
    [direct.replace('postgresql:', 'https:'), 'DB_PROTOCOL_REJECTED'],
    [direct.replace('ep-odd-paper-azxfykgo.c-3.ap-southeast-1.aws.neon.tech', 'private-unknown-host.example'), 'DB_HOST_REJECTED'],
    [direct.replace('vps_tr_mock', 'private-wrong-database'), 'DB_NAME_REJECTED'],
    [direct.replace('vps_tr_mock', '%E0%A4%A'), 'DB_PATH_INVALID'],
    [direct.replace('?sslmode=require', ''), 'DB_TLS_MISSING'],
    [direct.replace('sslmode=require', 'sslmode='), 'DB_TLS_INVALID'],
    [direct.replace('sslmode=require', 'sslmode=disable'), 'DB_TLS_INVALID'],
    [direct + '&schema=private-schema', 'DB_SCHEMA_REJECTED'],
    [direct + '&private-unknown-option=private-value', 'DB_QUERY_UNKNOWN'],
    [direct + '&sslmode=require', 'DB_QUERY_DUPLICATE'],
    [direct + '&schema=public&schema=private-schema', 'DB_QUERY_DUPLICATE'],
    [direct.replace('/vps_tr_mock?', ':5555/vps_tr_mock?'), 'DB_PORT_REJECTED'],
    [direct + '#private-fragment', 'DB_FRAGMENT_REJECTED'],
];

test('shared boundary gives a typed fixed reason for every target guard without target values', () => {
    for (const [url, code] of rejectedTargets) {
        assert.throws(() => boundary.assertPreviewDatabaseTarget({ ...env, DATABASE_URL: url }), (error) => {
            assert.ok(error instanceof boundary.PreviewDatabaseTargetError);
            assert.equal(error.code, code);
            for (const secret of [direct, 'private-', 'ep-odd-paper-', 'vps_tr_mock']) {
                assert.ok(!String(error).includes(secret));
                assert.ok(!JSON.stringify(error).includes(secret));
            }
            return true;
        });
    }
    assert.throws(() => boundary.assertPreviewDatabaseTarget({ ...env, APP_ENV: 'production' }), (error) => error.code === 'DB_ENV_REJECTED');
});

test('every boundary reason passes safely through either preparation target stage before any side effect', async () => {
    for (const [url, code] of rejectedTargets) {
        for (const [key, stage] of [['DATABASE_URL', 'validate-database'], ['DIRECT_URL', 'validate-direct']]) {
            const h = ports();
            await assert.rejects(preparation.preparePreview({ ...env, [key]: url }, h.ports), (error) => diagnostic(error, stage, code));
            assert.deepEqual(h.calls, []);
        }
    }
});

function legacyBoundaryAccepts(input) {
    try {
        if (input.APP_ENV !== 'preview' || (input.VERCEL_ENV && input.VERCEL_ENV !== 'preview')) return false;
        const target = new URL(input.DATABASE_URL || '');
        const allowedParameters = new Set(['sslmode', 'channel_binding', 'schema', 'connection_limit', 'pool_timeout', 'connect_timeout', 'statement_cache_size', 'pgbouncer', 'application_name']);
        const parameters = Array.from(target.searchParams.keys());
        if ((target.port && target.port !== '5432') || target.hash || new Set(parameters).size !== parameters.length || parameters.some((key) => !allowedParameters.has(key)) || !['require', 'verify-ca', 'verify-full'].includes(target.searchParams.get('sslmode') || '')) return false;
        return ['postgresql:', 'postgres:'].includes(target.protocol)
            && new Set(['ep-odd-paper-azxfykgo.c-3.ap-southeast-1.aws.neon.tech', 'ep-odd-paper-azxfykgo-pooler.c-3.ap-southeast-1.aws.neon.tech']).has(target.hostname)
            && decodeURIComponent(target.pathname.slice(1)) === 'vps_tr_mock'
            && !(target.searchParams.get('schema') && target.searchParams.get('schema') !== 'public');
    } catch { return false; }
}

test('finer diagnostics preserve the existing boundary acceptance predicate', () => {
    const urls = [
        direct, direct.replace('postgresql:', 'postgres:'), direct.replace('azxfykgo.c-3', 'azxfykgo-pooler.c-3'),
        direct.replace('/vps_tr_mock?', ':5432/vps_tr_mock?'), direct.replace('sslmode=require', 'sslmode=verify-full'),
        direct.replace('sslmode=require', 'sslmode=verify-ca'), direct + '&schema=public', direct + '&schema=',
        direct + '&channel_binding=require&connection_limit=1&pool_timeout=5&connect_timeout=5&statement_cache_size=0&pgbouncer=true&application_name=synthetic',
        direct.replace('vps_tr_mock', 'vps_tr_%6dock'), direct + '#', ...rejectedTargets.map(([url]) => url),
    ];
    for (const url of urls) {
        for (const app of ['preview', 'production', undefined]) {
            for (const vercel of ['preview', 'production', '', undefined]) {
                const input = { APP_ENV: app, VERCEL_ENV: vercel, DATABASE_URL: url };
                let accepted = true;
                try { boundary.assertPreviewDatabaseTarget(input); } catch { accepted = false; }
                assert.equal(accepted, legacyBoundaryAccepts(input));
            }
        }
    }
});
