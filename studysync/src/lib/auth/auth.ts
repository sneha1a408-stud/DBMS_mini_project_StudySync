import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { queryOne } from '@/lib/db/postgres';

export const authOptions: NextAuthOptions = {
  providers: [
    // Student credentials provider
    CredentialsProvider({
      id: 'student-credentials',
      name: 'Student Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const student = await queryOne<{
          student_id: string;
          name: string;
          email: string;
          password_hash: string;
          is_active: number | boolean;
        }>(
          'SELECT student_id, name, email, password_hash, is_active FROM students WHERE email = $1',
          [credentials.email]
        );

        if (!student) return null;

        if (student.is_active === 0 || student.is_active === false) {
          throw new Error('Access Revoked: Your account has been removed by the course coordinator.');
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          student.password_hash
        );
        if (!isValid) return null;

        return {
          id: student.student_id,
          email: student.email,
          name: student.name,
          role: 'student',
        };
      },
    }),
    // Coordinator credentials provider
    CredentialsProvider({
      id: 'coordinator-credentials',
      name: 'Coordinator Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const coordinator = await prisma.coordinator.findUnique({
          where: { email: credentials.email },
        });

        if (!coordinator) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          coordinator.password_hash
        );
        if (!isValid) return null;

        return {
          id: coordinator.coordinator_id,
          email: coordinator.email,
          name: coordinator.name,
          role: 'coordinator',
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
