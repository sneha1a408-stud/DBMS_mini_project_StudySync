/**
 * StudySync - MongoDB Index Initialization & Optimization Script
 * 
 * Part of PES University DBMS Level 3 Project Requirements
 * 
 * Target Database: studysync
 * Target Collection: session_feedback
 * 
 * Run with:
 *   node database/mongo_indexes.js
 */

const path = require('path');
let MongoClient;
try {
  MongoClient = require('mongodb').MongoClient;
} catch (e) {
  MongoClient = require(path.join(__dirname, '../studysync/node_modules/mongodb')).MongoClient;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync';
const DB_NAME = 'studysync';
const COLLECTION_NAME = 'session_feedback';

async function setupIndexes() {
  console.log('='.repeat(65));
  console.log(' StudySync - MongoDB Index Management & Optimization');
  console.log('='.repeat(65));
  console.log(`Connecting to: ${MONGODB_URI}`);

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(`Connected to database "${DB_NAME}", collection "${COLLECTION_NAME}"\n`);

    console.log('Configuring Indexes:');
    console.log('-------------------------------------------------------------');

    // 1. Unique Compound Index: { student_id: 1, session_id: 1 }
    // Rationale: Business rule dictates that each student can submit at most ONE
    // feedback entry per study session. This unique compound index prevents duplicate
    // reviews at the storage engine level (avoiding race conditions) and optimizes
    // the pre-insert check: collection.findOne({ student_id, session_id }).
    console.log('1. Creating Unique Compound Index: { student_id: 1, session_id: 1 }');
    const idx1 = await collection.createIndex(
      { student_id: 1, session_id: 1 },
      { unique: true, name: 'uniq_student_session_feedback' }
    );
    console.log(`   -> Created: ${idx1} (unique: true)`);

    // 2. Single-Field Index: { course_id: 1 }
    // Rationale: The Coordinator Dashboard performs an aggregation pipeline starting with:
    // { $match: { course_id: { $in: courseIds } } }
    // An index on course_id allows the query planner to use an IXSCAN rather than a COLLSCAN,
    // reducing scan complexity from O(N) to O(log N + M) where M is matching documents.
    console.log('2. Creating Single-Field Index: { course_id: 1 }');
    const idx2 = await collection.createIndex(
      { course_id: 1 },
      { name: 'idx_course_id' }
    );
    console.log(`   -> Created: ${idx2}`);

    // 3. Compound Index: { session_id: 1, created_at: -1 }
    // Rationale: When retrieving session review history, the query pattern is:
    // collection.find({ session_id }).sort({ created_at: -1 }).limit(50)
    // This compound index satisfies both the equality filter on session_id and the
    // descending sort order on created_at, preventing expensive in-memory sorts.
    console.log('3. Creating Compound Index: { session_id: 1, created_at: -1 }');
    const idx3 = await collection.createIndex(
      { session_id: 1, created_at: -1 },
      { name: 'idx_session_created' }
    );
    console.log(`   -> Created: ${idx3}`);

    // 4. Single-Field Index: { rating: 1 }
    // Rationale: Accelerates analytical queries, histogram bucketing, and rating distribution
    // aggregations across sessions.
    console.log('4. Creating Single-Field Index: { rating: 1 }');
    const idx4 = await collection.createIndex(
      { rating: 1 },
      { name: 'idx_rating' }
    );
    console.log(`   -> Created: ${idx4}`);

    // 5. Single-Field Index: { group_id: 1 }
    // Rationale: Optimizes group-level feedback aggregation and analytics.
    console.log('5. Creating Single-Field Index: { group_id: 1 }');
    const idx5 = await collection.createIndex(
      { group_id: 1 },
      { name: 'idx_group_id' }
    );
    console.log(`   -> Created: ${idx5}\n`);

    console.log('-------------------------------------------------------------');
    console.log('Active Indexes on session_feedback:');
    console.log('-------------------------------------------------------------');
    const allIndexes = await collection.indexes();
    allIndexes.forEach((idx, i) => {
      console.log(`${i + 1}. Name: ${idx.name}`);
      console.log(`   Keys: ${JSON.stringify(idx.key)}`);
      console.log(`   Unique: ${!!idx.unique}`);
      console.log('');
    });

    console.log('Index setup completed successfully!');
  } catch (err) {
    console.error('Index setup error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  setupIndexes();
}

module.exports = { setupIndexes };
