import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema"; // Adjusted path
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config'; // Load env vars

// --- Postgres Setup ---
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in .env");
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

// --- Firebase Setup ---
// Assumes GOOGLE_APPLICATION_CREDENTIALS or default auth
if (getApps().length === 0) {
    initializeApp();
}
const firestore = getFirestore();

async function migrateUsers() {
    console.log('Migrating Users...');
    const users = await db.select().from(schema.users);
    const batch = firestore.batch();
    let count = 0;

    for (const user of users) {
        const docRef = firestore.collection('users').doc(user.id.toString()); // Use ID as doc ID? Or Auto-ID?
        // Strategy: Use Database ID as Document ID for easy mapping?
        // OR keep strict mapping. Let's use ID as Doc ID for now.
        // NOTE: user.id is number. Firestore IDs are strings.

        // Convert Date objects to Firestore timestamps automatically
        batch.set(docRef, { ...user, id: user.id });
        count++;
    }
    await batch.commit();
    console.log(`Migrated ${count} users.`);
}

async function migratePatients() {
    console.log('Migrating Patients...');
    const patients = await db.select().from(schema.patients);
    const batch = firestore.batch();
    let count = 0;

    for (const patient of patients) {
        const docRef = firestore.collection('patients').doc(patient.id.toString());
        batch.set(docRef, { ...patient, id: patient.id });
        count++;
    }
    await batch.commit();
    console.log(`Migrated ${count} patients.`);
}

async function main() {
    try {
        await migrateUsers();
        await migratePatients();
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

main();
