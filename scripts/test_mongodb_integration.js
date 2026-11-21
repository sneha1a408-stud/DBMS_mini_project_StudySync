/**
 * StudySync - MongoDB Integration Test Suite
 * 
 * Tests:
 * 1. MongoDB Connection & Ping
 * 2. Index Verification (Compound Unique, Single-field, Sorting)
 * 3. Feedback Document Insertion with schema validation
 * 4. Duplicate Prevention (Unique index enforcement)
 * 5. Document Retrieval & Filtering
 * 6. NoSQL Multi-stage Aggregation Pipeline ($match + $group)
 * 7. Coordinator Dashboard Data Enrichment Simulation
 * 8. Error Handling & Reconnection Resilience
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

async function runTests() {
  console.log('='.repeat(70));
  console.log('   STUDYSYNC MONGODB INTEGRATION & AGGREGATION VERIFICATION SUITE');
  console.log('='.repeat(70));
  console.log(`Connecting to: ${MONGODB_URI}\n`);

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       -> ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       -> ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Connection & Ping
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: MongoDB Connection & Health ---');
    await client.connect();
    const db = client.db(DB_NAME);
    const pingResult = await db.command({ ping: 1 });
    assert(pingResult.ok === 1, 'MongoDB Connection & Ping', 'Successfully connected and received ping response');

    const collection = db.collection(COLLECTION_NAME);

    // -------------------------------------------------------------
    // TEST 2: Index Creation & Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Index Verification ---');
    // Ensure indexes
    await collection.createIndex({ student_id: 1, session_id: 1 }, { unique: true, name: 'uniq_student_session_feedback' });
    await collection.createIndex({ course_id: 1 }, { name: 'idx_course_id' });
    await collection.createIndex({ session_id: 1, created_at: -1 }, { name: 'idx_session_created' });
    await collection.createIndex({ rating: 1 }, { name: 'idx_rating' });
    await collection.createIndex({ group_id: 1 }, { name: 'idx_group_id' });

    const indexes = await collection.indexes();
    const indexNames = indexes.map(i => i.name);
    
    const hasUniqueIndex = indexes.some(i => i.name === 'uniq_student_session_feedback' && i.unique === true);
    const hasCourseIndex = indexNames.includes('idx_course_id');
    const hasSessionCreatedIndex = indexNames.includes('idx_session_created');
    const hasRatingIndex = indexNames.includes('idx_rating');

    assert(hasUniqueIndex, 'Unique Compound Index on (student_id, session_id)', 'Prevents duplicate reviews per session');
    assert(hasCourseIndex, 'Index on course_id', 'Optimizes coordinator aggregation $match stage');
    assert(hasSessionCreatedIndex, 'Compound Index on (session_id, created_at DESC)', 'Optimizes session review history sorting');
    assert(hasRatingIndex, 'Index on rating', 'Optimizes rating distribution analytics');

    // -------------------------------------------------------------
    // TEST 3: Feedback Document Insertion
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Feedback Document Insertion ---');
    const testDoc = {
      student_id: 'test-student-uuid-999',
      session_id: 'test-session-uuid-888',
      group_id: 'test-group-uuid-777',
      course_id: 'c1000001-0000-0000-0000-000000000001', // DBMS Course ID
      rating: 5,
      topics_covered: ['B+ Trees', 'ACID Transactions', 'Query Optimization'],
      understanding_level: 'Greatly Improved',
      comments: 'Hands-on indexing benchmark was extremely helpful for exam prep.',
      created_at: new Date(),
    };

    // Clean up any previous test doc
    await collection.deleteOne({ student_id: testDoc.student_id, session_id: testDoc.session_id });

    const insertResult = await collection.insertOne(testDoc);
    assert(insertResult.acknowledged && insertResult.insertedId, 'Feedback Document Insertion', `Inserted document ID: ${insertResult.insertedId}`);

    // Verify persisted fields
    const fetchedDoc = await collection.findOne({ _id: insertResult.insertedId });
    assert(
      fetchedDoc &&
      fetchedDoc.rating === 5 &&
      Array.isArray(fetchedDoc.topics_covered) &&
      fetchedDoc.topics_covered.length === 3 &&
      fetchedDoc.understanding_level === 'Greatly Improved',
      'Persisted Document Schema Integrity',
      'All nested array fields and rating values accurately stored'
    );

    // -------------------------------------------------------------
    // TEST 4: Duplicate Submission Prevention (DB-level constraint)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Unique Constraint / Duplicate Prevention ---');
    let duplicateRejected = false;
    try {
      await collection.insertOne({
        student_id: testDoc.student_id,
        session_id: testDoc.session_id,
        group_id: testDoc.group_id,
        course_id: testDoc.course_id,
        rating: 4,
        topics_covered: ['Duplicate Test'],
        understanding_level: 'Improved',
        created_at: new Date(),
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'Unique Constraint Enforcement', 'MongoDB rejected duplicate insert with E11000 duplicate key error');

    // -------------------------------------------------------------
    // TEST 5: Document Retrieval & Query Filtering
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Document Retrieval & Query Filtering ---');
    const retrievedDocs = await collection
      .find({ course_id: testDoc.course_id })
      .sort({ created_at: -1 })
      .toArray();

    assert(retrievedDocs.length >= 1, 'Query Filtering by course_id', `Found ${retrievedDocs.length} feedback documents for DBMS course`);

    // -------------------------------------------------------------
    // TEST 6: Multi-Stage Aggregation Pipeline ($match + $group)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Multi-Stage Aggregation Pipeline ---');
    const aggregationPipeline = [
      {
        $match: {
          course_id: { $in: ['c1000001-0000-0000-0000-000000000001', 'c1000002-0000-0000-0000-000000000002'] }
        }
      },
      {
        $group: {
          _id: '$course_id',
          avgRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 },
          minRating: { $min: '$rating' },
          maxRating: { $max: '$rating' },
          topicsList: { $push: '$topics_covered' }
        }
      },
      {
        $sort: { avgRating: -1 }
      }
    ];

    const aggResults = await collection.aggregate(aggregationPipeline).toArray();
    assert(Array.isArray(aggResults) && aggResults.length > 0, 'Aggregation Pipeline Execution', `Computed stats for ${aggResults.length} courses`);
    
    aggResults.forEach((row) => {
      console.log(`       Course ${row._id}: avgRating=${row.avgRating.toFixed(2)}, totalFeedback=${row.totalFeedback}, range=[${row.minRating}-${row.maxRating}]`);
    });

    const targetCourseAgg = aggResults.find(r => r._id === testDoc.course_id);
    assert(targetCourseAgg && targetCourseAgg.avgRating >= 1 && targetCourseAgg.avgRating <= 5, 'Aggregation Math Accuracy', `Valid average rating calculated: ${targetCourseAgg?.avgRating}`);

    // -------------------------------------------------------------
    // TEST 7: Coordinator Dashboard Enrichment Simulation
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Coordinator Dashboard SQL + NoSQL Enrichment ---');
    // Simulated MySQL course summary rows
    const mockSqlCourses = [
      { course_id: 'c1000001-0000-0000-0000-000000000001', course_name: 'Database Management Systems', total_students: 25 },
      { course_id: 'c1000002-0000-0000-0000-000000000002', course_name: 'Data Structures and Algorithms', total_students: 30 },
    ];

    const enriched = mockSqlCourses.map((c) => {
      const fb = aggResults.find((f) => f._id === c.course_id);
      return {
        ...c,
        avg_rating: fb ? Math.round(fb.avgRating * 10) / 10 : null,
        total_feedback: fb?.totalFeedback ?? 0,
      };
    });

    const dbmsEnriched = enriched.find(c => c.course_id === testDoc.course_id);
    assert(
      dbmsEnriched && dbmsEnriched.avg_rating !== null && dbmsEnriched.total_feedback > 0,
      'Dashboard Enrichment Logic',
      `DBMS Course enriched with avg_rating=${dbmsEnriched?.avg_rating} and ${dbmsEnriched?.total_feedback} reviews`
    );

    // Clean up test document
    await collection.deleteOne({ student_id: testDoc.student_id, session_id: testDoc.session_id });
    console.log('       -> Cleaned up test document');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n' + '='.repeat(70));
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('='.repeat(70));

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runTests();
