import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { getFeedbackCollection, ensureMongoIndexes } from '@/lib/db/mongodb';
import { feedbackSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data = feedbackSchema.parse(body);

    // Ensure database indexes exist (idempotent)
    await ensureMongoIndexes().catch(() => {});

    const collection = getFeedbackCollection();

    // Application-level duplicate prevention check
    const existing = await collection.findOne({
      student_id: session.user.id,
      session_id: data.session_id,
    });
    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted feedback for this session.' },
        { status: 409 }
      );
    }

    const doc = {
      student_id: session.user.id,
      session_id: data.session_id,
      group_id: data.group_id,
      course_id: data.course_id,
      rating: data.rating,
      topics_covered: data.topics_covered,
      understanding_level: data.understanding_level,
      comments: data.comments ?? '',
      created_at: new Date(),
    };

    const result = await collection.insertOne(doc);
    return NextResponse.json({ success: true, id: result.insertedId }, { status: 201 });
  } catch (err: any) {
    // Schema validation errors
    if (err && typeof err === 'object' && 'name' in err && err.name === 'ZodError') {
      const issues = (err as { issues?: Array<{ message: string }> }).issues || (err as { errors?: Array<{ message: string }> }).errors;
      const message = issues && issues.length > 0 ? issues[0].message : 'Validation failed';
      return NextResponse.json(
        { error: message, details: issues },
        { status: 400 }
      );
    }
    // Database-level duplicate key error (code 11000) from unique compound index
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: 'You have already submitted feedback for this session.' },
        { status: 409 }
      );
    }
    // Database connection failure
    if (err?.name === 'MongoServerSelectionError' || err?.name === 'MongoNetworkError') {
      console.error('MongoDB connection error:', err);
      return NextResponse.json(
        { error: 'Database service unavailable: Could not connect to MongoDB.' },
        { status: 503 }
      );
    }
    console.error('Feedback error:', err);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const courseId = searchParams.get('courseId');

    const collection = getFeedbackCollection();
    const filter: Record<string, string> = {};
    if (sessionId) filter.session_id = sessionId;
    if (courseId) filter.course_id = courseId;

    // MongoDB Aggregation Pipeline — calculates avg rating and groups feedback
    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: sessionId ? '$session_id' : '$course_id',
          avgRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 },
          ratingDistribution: { $push: '$rating' },
          recentComments: {
            $push: { comment: '$comments', rating: '$rating', understanding: '$understanding_level' },
          },
        },
      },
      { $sort: { avgRating: -1 as const } },
    ];

    const feedbackList = await collection.find(filter).sort({ created_at: -1 }).limit(50).toArray();
    const aggregated = await collection.aggregate(pipeline).toArray();

    return NextResponse.json({ feedback: feedbackList, aggregated });
  } catch (err: any) {
    if (err?.name === 'MongoServerSelectionError' || err?.name === 'MongoNetworkError') {
      console.error('MongoDB connection error in GET feedback:', err);
      return NextResponse.json(
        { error: 'Database service unavailable: Could not connect to MongoDB.', feedback: [], aggregated: [] },
        { status: 503 }
      );
    }
    console.error('Feedback fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
