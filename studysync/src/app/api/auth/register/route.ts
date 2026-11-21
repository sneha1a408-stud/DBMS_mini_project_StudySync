import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { registerSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Check if email already exists
    const existing = await prisma.student.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const password_hash = await bcrypt.hash(data.password, 12);

    // Generate readable student roll number (e.g. UGCS001, UGCS002)
    const totalStudents = await prisma.student.count();
    const student_id = `UGCS${String(totalStudents + 1).padStart(3, '0')}`;

    const student = await prisma.student.create({
      data: {
        student_id,
        name: data.name,
        email: data.email,
        password_hash,
        learning_style: data.learning_style ?? null,
      },
      select: {
        student_id: true,
        name: true,
        email: true,
        learning_style: true,
        created_at: true,
      },
    });

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      const issues = (err as unknown as { issues: Array<{ message: string }> }).issues;
      const firstMessage = issues?.[0]?.message || 'Validation failed';
      return NextResponse.json({ error: firstMessage, issues }, { status: 400 });
    }
    
    console.error('Registration error:', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    
    if (errMsg.includes("Can't reach database server") || errMsg.includes('ECONNREFUSED') || errMsg.includes('connection error')) {
      return NextResponse.json({
        error: 'Database connection failed: Cannot connect to database server. Please check that MySQL is running and credentials in .env are correct.',
      }, { status: 503 });
    }

    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    return NextResponse.json({ error: errMsg || 'Registration failed. Please try again.' }, { status: 500 });
  }
}
