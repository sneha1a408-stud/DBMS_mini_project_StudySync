import { z } from 'zod';

// ===== Auth schemas =====
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter (A-Z)')
    .regex(/[0-9]/, 'Password must contain at least one number (0-9)'),
  learning_style: z
    .enum(['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'])
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val ?? undefined)),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['student', 'coordinator']).default('student'),
});

// ===== Profile schemas =====
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  learning_style: z
    .enum(['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'])
    .optional()
    .nullable(),
  bio: z.string().max(500).optional().nullable(),
});

// ===== Availability schemas =====
export const availabilitySchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
}).refine(
  (data) => data.start_time < data.end_time,
  { message: 'End time must be after start time', path: ['end_time'] }
);

// ===== ID schema (supports standard UUIDs and 36-char seed GUIDs) =====
const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// ===== Enrollment schemas =====
export const enrollmentSchema = z.object({
  course_id: z.string().regex(uuidPattern, 'Invalid course ID format'),
  skill_level: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
});

// ===== Study Group schemas =====
export const createGroupSchema = z.object({
  group_name: z.string().min(3, 'Group name must be at least 3 characters').max(200),
  course_id: z.string().regex(uuidPattern, 'Invalid course ID format'),
  description: z.string().max(500).optional(),
  max_members: z.number().int().min(2).max(20).default(6),
});

// ===== Session schemas =====
export const createSessionSchema = z.object({
  group_id: z.string().regex(uuidPattern, 'Invalid group ID format'),
  schedule_time: z.string().datetime({ message: 'Invalid datetime format' }),
  location: z.string().min(1, 'Location is required').max(255),
  duration_minutes: z
    .number()
    .int()
    .min(15, 'Session must be at least 15 minutes')
    .max(480, 'Session cannot exceed 8 hours'),
});

// ===== Feedback schemas =====
export const feedbackSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
  group_id: z.string().min(1, 'Group ID is required'),
  course_id: z.string().min(1, 'Course ID is required'),
  rating: z.number().int().min(1).max(5),
  topics_covered: z.array(z.string().min(1)).min(1, 'At least one topic required'),
  understanding_level: z.enum([
    'Low',
    'Medium',
    'High',
    'Did Not Improve',
    'Slightly Improved',
    'Improved',
    'Greatly Improved',
  ]),
  comments: z.string().max(1000).optional(),
});

// ===== Course schemas (coordinator) =====
export const createCourseSchema = z.object({
  course_name: z.string().min(3).max(200),
  department: z.string().min(2).max(100),
  semester: z.string().min(1).max(20),
  description: z.string().max(1000).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
