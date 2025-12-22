import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import * as schema from './schema';
import fs from 'fs';

// Database file path
const DB_DIR = path.join(process.cwd(), 'data', 'db');
const DB_PATH = path.join(DB_DIR, 'medical_assistant.db');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Lazy initialization function
const createDb = () => {
    try {
        const Database = require('better-sqlite3');
        const sqlite = new Database(DB_PATH);
        return drizzle(sqlite, { schema });
    } catch (error) {
        console.error("Failed to initialize database:", error);
        throw error;
    }
};

// Singleton instance
export const db = createDb();

// Export everything from schema for convenience
export * from './schema';
