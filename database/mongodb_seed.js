// MongoDB seed script – run with:
// mongosh studysync database/mongodb_seed.js
// Or with Node.js: node database/mongodb_seed.js

const path = require('path');
let MongoClient;
try {
  MongoClient = require('mongodb').MongoClient;
} catch (e) {
  MongoClient = require(path.join(__dirname, '../studysync/node_modules/mongodb')).MongoClient;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync';

const feedbackDocs = [
  // DB Wizards Session 1 (completed)
  {
    student_id: 's1000001-0000-0000-0000-000000000001',
    session_id: 'e0000001-0000-0000-0000-000000000001',
    group_id:   'g0000001-0000-0000-0000-000000000001',
    course_id:  'c1000001-0000-0000-0000-000000000001',
    rating: 5,
    topics_covered: ['Normalization', 'ER Diagrams', 'Primary Keys'],
    understanding_level: 'Greatly Improved',
    comments: 'Alice led a great session on normalization. The 3NF explanation finally clicked for me.',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000003-0000-0000-0000-000000000003',
    session_id: 'e0000001-0000-0000-0000-000000000001',
    group_id:   'g0000001-0000-0000-0000-000000000001',
    course_id:  'c1000001-0000-0000-0000-000000000001',
    rating: 4,
    topics_covered: ['Normalization', 'ER Diagrams'],
    understanding_level: 'Improved',
    comments: 'Good session. We went through all three normal forms with examples.',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000004-0000-0000-0000-000000000004',
    session_id: 'e0000001-0000-0000-0000-000000000001',
    group_id:   'g0000001-0000-0000-0000-000000000001',
    course_id:  'c1000001-0000-0000-0000-000000000001',
    rating: 5,
    topics_covered: ['Normalization'],
    understanding_level: 'Greatly Improved',
    comments: 'Very productive study session. The group dynamics are excellent.',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  },
  // DB Wizards Session 2 (completed)
  {
    student_id: 's1000001-0000-0000-0000-000000000001',
    session_id: 'e0000002-0000-0000-0000-000000000002',
    group_id:   'g0000001-0000-0000-0000-000000000001',
    course_id:  'c1000001-0000-0000-0000-000000000001',
    rating: 4,
    topics_covered: ['SQL Joins', 'Subqueries', 'Transactions'],
    understanding_level: 'Improved',
    comments: 'Transactions and ACID properties are clearer now. Need more practice with complex joins.',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000007-0000-0000-0000-000000000007',
    session_id: 'e0000002-0000-0000-0000-000000000002',
    group_id:   'g0000001-0000-0000-0000-000000000001',
    course_id:  'c1000001-0000-0000-0000-000000000001',
    rating: 5,
    topics_covered: ['SQL Joins', 'Subqueries', 'Triggers'],
    understanding_level: 'Greatly Improved',
    comments: 'Excellent session! We wrote real triggers together. Very hands-on.',
    extra_resources: ['PostgreSQL docs', 'W3Schools SQL'],
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  // SQL Beginners Circle
  {
    student_id: 's1000002-0000-0000-0000-000000000002',
    session_id: 'e0000004-0000-0000-0000-000000000004',
    group_id:   'g0000002-0000-0000-0000-000000000002',
    course_id:  'c1000001-0000-0000-0000-000000000001',
    rating: 4,
    topics_covered: ['Basic SELECT', 'WHERE clauses', 'INSERT'],
    understanding_level: 'Improved',
    comments: 'Good beginner-friendly session. The examples were relatable.',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000005-0000-0000-0000-000000000005',
    session_id: 'e0000004-0000-0000-0000-000000000004',
    group_id:   'g0000002-0000-0000-0000-000000000002',
    course_id:  'c1000001-0000-0000-0000-000000000001',
    rating: 3,
    topics_covered: ['Basic SELECT', 'WHERE clauses'],
    understanding_level: 'Slightly Improved',
    comments: 'Session was okay but we went too slow for my pace.',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  },
  // Algorithm Aces
  {
    student_id: 's1000013-0000-0000-0000-000000000013',
    session_id: 'e0000006-0000-0000-0000-000000000006',
    group_id:   'g0000003-0000-0000-0000-000000000003',
    course_id:  'c1000002-0000-0000-0000-000000000002',
    rating: 5,
    topics_covered: ['Dynamic Programming', 'Memoization', 'Tabulation'],
    understanding_level: 'Greatly Improved',
    comments: 'Mia explained DP so well! Solved 5 LeetCode problems in the session.',
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000001-0000-0000-0000-000000000001',
    session_id: 'e0000006-0000-0000-0000-000000000006',
    group_id:   'g0000003-0000-0000-0000-000000000003',
    course_id:  'c1000002-0000-0000-0000-000000000002',
    rating: 5,
    topics_covered: ['Dynamic Programming', 'Graph Algorithms'],
    understanding_level: 'Greatly Improved',
    comments: 'Best study session I have had. The group energy was fantastic.',
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000018-0000-0000-0000-000000000018',
    session_id: 'e0000007-0000-0000-0000-000000000007',
    group_id:   'g0000003-0000-0000-0000-000000000003',
    course_id:  'c1000002-0000-0000-0000-000000000002',
    rating: 4,
    topics_covered: ['Graphs', 'BFS', 'DFS', 'Dijkstra'],
    understanding_level: 'Improved',
    comments: 'Graph traversal clicked for me today. Need to practice more Dijkstra.',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  },
  // Web Dev Workshop
  {
    student_id: 's1000005-0000-0000-0000-000000000005',
    session_id: 'e0000009-0000-0000-0000-000000000009',
    group_id:   'g0000004-0000-0000-0000-000000000004',
    course_id:  'c1000005-0000-0000-0000-000000000005',
    rating: 5,
    topics_covered: ['React Hooks', 'Next.js App Router', 'API Routes'],
    understanding_level: 'Greatly Improved',
    comments: 'We built a full mini-app together. Learned so much in 3 hours!',
    project_built: 'Todo App with PostgreSQL',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000010-0000-0000-0000-000000000010',
    session_id: 'e0000009-0000-0000-0000-000000000009',
    group_id:   'g0000004-0000-0000-0000-000000000004',
    course_id:  'c1000005-0000-0000-0000-000000000005',
    rating: 4,
    topics_covered: ['React Hooks', 'API Routes'],
    understanding_level: 'Improved',
    comments: 'Jake showed us how to properly structure API routes. Very useful.',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  // OS Deep Divers
  {
    student_id: 's1000006-0000-0000-0000-000000000006',
    session_id: 'e0000011-0000-0000-0000-000000000011',
    group_id:   'g0000005-0000-0000-0000-000000000005',
    course_id:  'c1000003-0000-0000-0000-000000000003',
    rating: 5,
    topics_covered: ['Process Scheduling', 'Deadlocks', 'Semaphores'],
    understanding_level: 'Greatly Improved',
    comments: 'Deep dive into OS scheduling. Frank really knows this material.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000014-0000-0000-0000-000000000014',
    session_id: 'e0000011-0000-0000-0000-000000000011',
    group_id:   'g0000005-0000-0000-0000-000000000005',
    course_id:  'c1000003-0000-0000-0000-000000000003',
    rating: 4,
    topics_covered: ['Process Scheduling', 'Semaphores'],
    understanding_level: 'Improved',
    comments: 'Very detailed discussion on semaphores and mutex locks.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  // ML Study Collective
  {
    student_id: 's1000011-0000-0000-0000-000000000011',
    session_id: 'e0000013-0000-0000-0000-000000000013',
    group_id:   'g0000006-0000-0000-0000-000000000006',
    course_id:  'c1000004-0000-0000-0000-000000000004',
    rating: 5,
    topics_covered: ['Linear Regression', 'Gradient Descent', 'Loss Functions'],
    understanding_level: 'Greatly Improved',
    comments: 'We coded linear regression from scratch in NumPy. Brilliant session!',
    code_snippets: ['numpy regression implementation', 'gradient descent visualization'],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000002-0000-0000-0000-000000000002',
    session_id: 'e0000013-0000-0000-0000-000000000013',
    group_id:   'g0000006-0000-0000-0000-000000000006',
    course_id:  'c1000004-0000-0000-0000-000000000004',
    rating: 4,
    topics_covered: ['Linear Regression', 'Gradient Descent'],
    understanding_level: 'Improved',
    comments: 'The math behind gradient descent is clearer now. The code demo helped a lot.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  // Stats Hub
  {
    student_id: 's1000003-0000-0000-0000-000000000003',
    session_id: 'e0000015-0000-0000-0000-000000000015',
    group_id:   'g0000007-0000-0000-0000-000000000007',
    course_id:  'c1000006-0000-0000-0000-000000000006',
    rating: 5,
    topics_covered: ['Hypothesis Testing', 'p-values', 'Type I/II Errors'],
    understanding_level: 'Greatly Improved',
    comments: 'Carol explained p-values so intuitively. The group had great discussions.',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000019-0000-0000-0000-000000000019',
    session_id: 'e0000015-0000-0000-0000-000000000015',
    group_id:   'g0000007-0000-0000-0000-000000000007',
    course_id:  'c1000006-0000-0000-0000-000000000006',
    rating: 3,
    topics_covered: ['Hypothesis Testing', 'p-values'],
    understanding_level: 'Slightly Improved',
    comments: 'Session moved fast. I need to review the material again before the next one.',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  },
  {
    student_id: 's1000023-0000-0000-0000-000000000023',
    session_id: 'e0000015-0000-0000-0000-000000000015',
    group_id:   'g0000007-0000-0000-0000-000000000007',
    course_id:  'c1000006-0000-0000-0000-000000000006',
    rating: 5,
    topics_covered: ['Hypothesis Testing', 'p-values', 'Confidence Intervals', 'ANOVA'],
    understanding_level: 'Greatly Improved',
    comments: 'Outstanding session. Wendy brought her stats notes and they were gold.',
    reference_materials: ['Statistics textbook Ch.8', 'Khan Academy Statistics'],
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  }
];

async function seedMongoDB() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('studysync');
    const collection = db.collection('session_feedback');

    // Non-destructive seed logic:
    // 1. NEVER clear or delete existing feedback (deleteMany removed).
    // 2. Preserve all existing user and seed records.
    // 3. For each sample document, use $setOnInsert with upsert: true.
    //    If a feedback entry for (student_id, session_id) already exists,
    //    MongoDB leaves it 100% untouched and does NOT overwrite or mutate it.
    let insertedCount = 0;
    let existingCount = 0;

    for (const doc of feedbackDocs) {
      const res = await collection.updateOne(
        { student_id: doc.student_id, session_id: doc.session_id },
        { $setOnInsert: doc },
        { upsert: true }
      );
      if (res.upsertedCount > 0) {
        insertedCount++;
      } else {
        existingCount++;
      }
    }

    console.log(`Seed check complete: ${insertedCount} new sample documents added, ${existingCount} existing documents preserved untouched.`);

    // Create indexes for query optimization and constraint enforcement
    console.log('Creating MongoDB indexes...');
    await collection.createIndex(
      { student_id: 1, session_id: 1 },
      { unique: true, name: 'uniq_student_session_feedback' }
    );
    await collection.createIndex({ course_id: 1 }, { name: 'idx_course_id' });
    await collection.createIndex({ session_id: 1, created_at: -1 }, { name: 'idx_session_created' });
    await collection.createIndex({ rating: 1 }, { name: 'idx_rating' });
    await collection.createIndex({ group_id: 1 }, { name: 'idx_group_id' });
    console.log('Created indexes successfully:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${!!idx.unique})`));

    // Test aggregation pipeline
    const avgRatings = await collection.aggregate([
      {
        $group: {
          _id: '$course_id',
          avgRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      },
      { $sort: { avgRating: -1 } }
    ]).toArray();

    console.log('\nAverage ratings by course:');
    avgRatings.forEach(r => {
      console.log(`  Course ${r._id}: ${r.avgRating.toFixed(2)} (${r.totalFeedback} reviews)`);
    });

    console.log('\nMongoDB seed complete!');
  } catch (err) {
    console.error('MongoDB seed error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedMongoDB();
