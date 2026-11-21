import { MongoClient, Db, Collection, Document } from 'mongodb';

// MongoDB URI from environment variable (credentials never hardcoded)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync';
const DB_NAME = 'studysync';

// Singleton MongoDB client across hot reloads in development
const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
  mongoDb: Db | undefined;
  indexesEnsured?: boolean;
};

// Client options for robust connection handling and fast failure detection
const clientOptions = {
  serverSelectionTimeoutMS: 5000, // Fail fast (5s) instead of hanging 30s if DB unreachable
  connectTimeoutMS: 5000,
  maxPoolSize: 10,
  minPoolSize: 1,
};

let client: MongoClient;
let db: Db;

if (process.env.NODE_ENV === 'production') {
  client = new MongoClient(MONGODB_URI, clientOptions);
  db = client.db(DB_NAME);
} else {
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = new MongoClient(MONGODB_URI, clientOptions);
    globalForMongo.mongoDb = globalForMongo.mongoClient.db(DB_NAME);
  }
  client = globalForMongo.mongoClient;
  db = globalForMongo.mongoDb!;
}

export { client as mongoClient, db as mongoDB };

/**
 * TypeScript interface representing a MongoDB session feedback document
 */
export interface SessionFeedbackDoc {
  student_id: string;
  session_id: string;
  group_id: string;
  course_id: string;
  rating: number;
  topics_covered: string[];
  understanding_level: 'Did Not Improve' | 'Slightly Improved' | 'Improved' | 'Greatly Improved';
  comments?: string;
  extra_resources?: string[];
  created_at: Date;
}

/**
 * Get the session_feedback collection.
 * MongoDB is used for session feedback because feedback documents
 * can have varying flexible fields (topics_covered, code_snippets,
 * reference_materials, etc.) without requiring relational schema migrations.
 */
export function getFeedbackCollection(): Collection<Document> {
  return db.collection('session_feedback');
}

/**
 * Ensure necessary indexes exist on session_feedback collection.
 * 
 * 1. { student_id: 1, session_id: 1 } (UNIQUE)
 *    Enforces referential uniqueness at the DB layer so each student
 *    can only submit one review per session. Also provides O(log N)
 *    duplicate checking before inserts.
 * 
 * 2. { course_id: 1 }
 *    Optimizes the coordinator dashboard aggregation $match stage
 *    ({ course_id: { $in: courseIds } }) via index scan (IXSCAN).
 * 
 * 3. { session_id: 1, created_at: -1 }
 *    Optimizes session review queries ordered by timestamp without
 *    in-memory sorting.
 * 
 * 4. { rating: 1 }
 *    Optimizes analytical queries and rating distributions.
 */
export async function ensureMongoIndexes(): Promise<void> {
  if (globalForMongo.indexesEnsured) return;
  try {
    const col = db.collection('session_feedback');
    await Promise.all([
      col.createIndex(
        { student_id: 1, session_id: 1 },
        { unique: true, name: 'uniq_student_session_feedback' }
      ),
      col.createIndex({ course_id: 1 }, { name: 'idx_course_id' }),
      col.createIndex({ session_id: 1, created_at: -1 }, { name: 'idx_session_created' }),
      col.createIndex({ rating: 1 }, { name: 'idx_rating' }),
    ]);
    globalForMongo.indexesEnsured = true;
  } catch (err) {
    console.warn('Could not auto-ensure MongoDB indexes:', err);
  }
}

/**
 * Connect to MongoDB and ping to confirm connection.
 */
export async function connectMongoDB(): Promise<Db> {
  try {
    await client.connect();
    // Ping to confirm connection
    await db.command({ ping: 1 });
    await ensureMongoIndexes();
    console.log('MongoDB connected successfully & indexes ensured');
    return db;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

/**
 * Health check to verify MongoDB connectivity
 */
export async function checkMongoHealth(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await client.connect();
    await db.command({ ping: 1 });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'MongoDB connection failed' };
  }
}
