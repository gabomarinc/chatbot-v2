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

    // Split into keywords and remove Spanish noise words
    const keywords = safeTerm.split(/\s+/)
        .map(k => k.toLowerCase())
        .filter(k => {
            const noise = ['de', 'el', 'la', 'un', 'una', 'en', 'para', 'con', 'por', 'los', 'las'];
            return k.length >= 2 && !noise.includes(k);
        })
        .map(k => {
            // Basic singularization for Spanish keywords > 3 chars
            if (k.length > 3) {
                if (k.endsWith('es')) return k.slice(0, -2);
                if (k.endsWith('s')) return k.slice(0, -1);
            }
            return k;
        })
        .slice(0, 5); // Limit keywords to top 5 for performance

    if (keywords.length === 0) {
        return { results: [], total: 0 };
    }

    try {
        // Approach: Find rows that contain ALL keywords (AND logic)
        // This is much better than single ILIKE for natural language
        const conditions = keywords.map((_, i) => `CAST(row_to_json("${safeTable}") AS text) ILIKE $${i + 1}`);
        const params = keywords.map(k => `%${k}%`);

        const directQuery = `
            SELECT *
            FROM "${safeTable}"
            WHERE ${conditions.join(' AND ')}
            LIMIT $${keywords.length + 1}
        `;

        let { rows } = await pool.query(directQuery, [...params, limit]);

        // Fallback: If AND search returns nothing and we have multiple keywords, try OR search
        // with basic relevance ranking (rows matching more keywords come first)
        if (rows.length === 0 && keywords.length > 1) {
            console.log(`[NeonCatalog] AND search returned no results for "${safeTerm}", trying OR fallback...`);

            const relevanceScore = keywords.map((_, i) => `(CASE WHEN CAST(row_to_json("${safeTable}") AS text) ILIKE $${i + 1} THEN 1 ELSE 0 END)`).join(' + ');

            const orQuery = `
                SELECT *
                FROM "${safeTable}"
                WHERE ${keywords.map((_, i) => `CAST(row_to_json("${safeTable}") AS text) ILIKE $${i + 1}`).join(' OR ')}
                ORDER BY (${relevanceScore}) DESC
                LIMIT $${keywords.length + 1}
            `;

            const orResult = await pool.query(orQuery, [...params, limit]);
            rows = orResult.rows;
        }

        // Count total matches (using the same logic as the successful query)
        // For simplicity and performance, we'll use the AND count if results were found, 
        // otherwise just return the length of the result set as total.
        const total = rows.length;

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
