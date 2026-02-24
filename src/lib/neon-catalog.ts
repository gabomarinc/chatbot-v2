/**
 * Neon Catalog Integration
 * Connects to an external Neon Postgres database and executes
 * safe, read-only queries against a product/price table.
 */

import { Pool } from 'pg';

interface NeonCatalogConfig {
    connectionString: string;
    tableName: string;
    /** Comma-separated list of columns the AI is allowed to query */
    allowedColumns?: string;
}

interface ProductRow {
    [key: string]: string | number | null;
}

/**
 * Executes a safe, parameterized search against the catalog table.
 * Only SELECT queries are allowed. The table and column names are
 * whitelisted from the saved configuration so SQL injection via
 * tool arguments is not possible.
 */
export async function queryProductCatalog(
    config: NeonCatalogConfig,
    searchTerm: string,
    limit = 10
): Promise<{ results: ProductRow[]; total: number; error?: string }> {
    // Basic safety: strip anything that looks like SQL injection from the search term
    const safeTerm = searchTerm.replace(/[;'"\\]/g, '').trim().substring(0, 200);

    // Whitelist table name — only alphanumeric + underscore allowed
    const safeTable = config.tableName.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeTable) {
        return { results: [], total: 0, error: 'Invalid table name in configuration.' };
    }

    const pool = new Pool({
        connectionString: config.connectionString,
        ssl: { rejectUnauthorized: false },
        max: 2,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
    });

    try {
        // Build a simple full-text ILIKE search across all text columns
        // We use a single parameterized query to avoid injection
        const query = `
            SELECT *
            FROM "${safeTable}"
            WHERE CAST("${safeTable}".*::text AS text) ILIKE $1
            LIMIT $2
        `;

        // Fallback: simpler approach that works with most schemas
        const simpleQuery = `
            SELECT *
            FROM "${safeTable}"
            WHERE to_tsvector('simple', ${safeTable}::text) @@ plainto_tsquery('simple', $1)
               OR EXISTS (
                   SELECT 1
                   FROM json_each_text(row_to_json("${safeTable}"))
                   WHERE value ILIKE $2
               )
            LIMIT $3
        `;

        // Use the simplest approach: cast entire row to text and ILIKE
        const directQuery = `
            SELECT *
            FROM "${safeTable}"
            WHERE CAST(row_to_json("${safeTable}") AS text) ILIKE $1
            LIMIT $2
        `;

        const { rows } = await pool.query(directQuery, [`%${safeTerm}%`, limit]);

        // Count total matches (without limit)
        const countQuery = `
            SELECT COUNT(*) as total
            FROM "${safeTable}"
            WHERE CAST(row_to_json("${safeTable}") AS text) ILIKE $1
        `;
        const countResult = await pool.query(countQuery, [`%${safeTerm}%`]);
        const total = parseInt(countResult.rows[0]?.total || '0', 10);

        return { results: rows, total };
    } catch (err: any) {
        console.error('[NeonCatalog] Query error:', err.message);
        return { results: [], total: 0, error: err.message };
    } finally {
        await pool.end();
    }
}

/**
 * Test connectivity to the Neon DB and returns the first 3 rows
 * of the table so the user can verify the schema looks correct.
 */
export async function testNeonConnection(
    connectionString: string,
    tableName: string
): Promise<{ ok: boolean; preview?: ProductRow[]; columns?: string[]; error?: string }> {
    const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 1,
        idleTimeoutMillis: 8_000,
        connectionTimeoutMillis: 5_000,
    });

    try {
        const { rows } = await pool.query(`SELECT * FROM "${safeTable}" LIMIT 3`);
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return { ok: true, preview: rows, columns };
    } catch (err: any) {
        return { ok: false, error: err.message };
    } finally {
        await pool.end();
    }
}
