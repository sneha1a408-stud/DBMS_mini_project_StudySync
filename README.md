# StudySync – Smart Peer Matching & Study Group Platform

A full-stack, polyglot DBMS mini-project combining **MySQL (Relational Core)** and **MongoDB (Document-based Feedback & Reviews)** with a modern **Next.js 16** frontend and application layer. (PostgreSQL dual-compatibility is also supported via environment configuration).

---

## 🏛️ Architecture Overview

```
+-------------------------------------------------------------------------+
|                               Next.js 16                                |
|  (App Router, NextAuth.js, Server-Side API Handlers, Responsive UI)     |
+-----------------------------------+-------------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-------------------------------+               +-----------------------+
|   MySQL 8.0 (ACID Core)       |               | MongoDB (Document DB) |
|  - Students & Coordinators    |               |  - Session Feedback   |
|  - Courses & Enrollments      |               |  - Rating (1-5 Stars) |
|  - Availability Schedules     |               |  - Topics Covered []  |
|  - Study Groups & Members     |               |  - Understanding Lvl  |
|  - Sessions & Notifications   |               |  - Dynamic Comments   |
|  - Views, Triggers, Procs     |               |  - Compound Indexes   |
|  - Transactions & ACID safety |               |  - Aggregation Pipe   |
+-------------------------------+               +-----------------------+
```

---

## 💾 Why Polyglot Persistence? (SQL vs. NoSQL)

| Dimension | Relational Database (MySQL) | Document Database (MongoDB) |
| :--- | :--- | :--- |
| **Role in StudySync** | Primary relational operational store | Secondary analytical review store |
| **Data Handled** | User profiles, course enrollments, study group memberships, scheduled sessions | Post-session subjective student feedback, ratings, and topic tags |
| **Schema Paradigm** | Rigid, normalized (3NF) relational tables | Dynamic, semi-structured JSON-like BSON documents |
| **Integrity & ACID** | Strict primary/foreign keys (`ON DELETE CASCADE`), CHECK constraints, row-level transactions | Eventual consistency, schema flexibility, atomic document operations |
| **Why Chosen Here?** | Guarantees strict referential integrity between students, groups, and academic courses. Prevents duplicate enrollments and overbooked groups via atomic triggers and transactions. | Session feedback documents vary wildly across domains (e.g. programming code snippets, subjective comprehension levels, multi-item topic tag arrays). Storing them in MongoDB avoids ALTER TABLE schema churn and allows multi-stage pipeline aggregation (`$match` + `$group`) for instant analytics. |

---

## 🍃 MongoDB Architecture & Implementation

### 1. Document Structure (`session_feedback` Collection)

Each review document captures rich, multi-dimensional feedback from a student following a completed study session:

```json
{
  "_id": { "$oid": "6aff543cdbc9f496c8ff04fe" },
  "student_id": "s1000001-0000-0000-0000-000000000001",
  "session_id": "e0000001-0000-0000-0000-000000000001",
  "group_id": "g0000001-0000-0000-0000-000000000001",
  "course_id": "c1000001-0000-0000-0000-000000000001",
  "rating": 5,
  "topics_covered": ["Normalization", "ER Diagrams", "Primary Keys"],
  "understanding_level": "Greatly Improved",
  "comments": "The 3NF explanation finally clicked for me during peer problem solving.",
  "extra_resources": ["W3Schools SQL", "Course Lecture 4 PDF"],
  "created_at": "2024-11-06T10:30:00.000Z"
}
```

### 2. Multi-Stage Aggregation Pipeline

In the Coordinator Academic Dashboard (`GET /api/coordinator/dashboard`) and Feedback API (`GET /api/feedback`), real-time analytics are computed dynamically using MongoDB's aggregation engine:

```javascript
db.session_feedback.aggregate([
  // STAGE 1: $match filters documents for the coordinator's managed courses (uses index idx_course_id)
  {
    $match: {
      course_id: { $in: [ "c1000001-0000-0000-0000-000000000001", "c1000002-0000-0000-0000-000000000002" ] }
    }
  },
  // STAGE 2: $group computes average rating, total review volume, and distributions
  {
    $group: {
      _id: "$course_id",
      avgRating: { $avg: "$rating" },
      totalFeedback: { $sum: 1 },
      ratingDistribution: { $push: "$rating" }
    }
  },
  // STAGE 3: $sort orders courses by average student rating descending
  {
    $sort: { avgRating: -1 }
  }
])
```

The resulting metrics (`avgRating`, `totalFeedback`) are dynamically merged with MySQL's `v_course_health_summary` view to present an integrated relational + document health matrix.

### 3. MongoDB Indexes & Performance Rationale

All indexes can be verified or rebuilt via `node database/mongo_indexes.js`:

| Index Name | Keys / Specification | Type | Rationale & Query Pattern |
| :--- | :--- | :--- | :--- |
| `uniq_student_session_feedback` | `{ student_id: 1, session_id: 1 }` | **Unique Compound** | Enforces the core business constraint that a student can only submit **one review per session** at the database layer (preventing race conditions). Accelerates duplicate lookup query `findOne({ student_id, session_id })`. |
| `idx_course_id` | `{ course_id: 1 }` | **Single-Field** | Converts the coordinator dashboard `$match: { course_id: { $in: [...] } }` stage from an $O(N)$ Collection Scan (`COLLSCAN`) to an $O(\log N)$ Index Scan (`IXSCAN`). |
| `idx_session_created` | `{ session_id: 1, created_at: -1 }` | **Compound Sort** | Satisfies the query `find({ session_id }).sort({ created_at: -1 })` when students view session feedback history without requiring in-memory buffer sorts. |
| `idx_rating` | `{ rating: 1 }` | **Single-Field** | Optimizes rating range filtering, histogram calculations, and quality audits. |
| `idx_group_id` | `{ group_id: 1 }` | **Single-Field** | Optimizes group-level review metrics and cohort engagement queries. |

---

## 🛠️ Setup & Execution Instructions

### 1. Database Setup

#### MySQL 8.0 Setup (Primary Relational Core):
```bash
# Execute schema, views, triggers, procedures, and seed data in MySQL
mysql -u root -p < database/mysql_schema.sql
mysql -u root -p < database/mysql_views.sql
mysql -u root -p < database/mysql_triggers.sql
mysql -u root -p < database/mysql_procedures.sql
mysql -u root -p < database/mysql_seed.sql
```

#### MongoDB 8.x / 7.x Setup (Secondary Document Store):
```bash
# 1. Ensure MongoDB service is running (default port 27017)
# On Windows (Services): Net Start MongoDB

# 2. Build indexes on session_feedback collection
node database/mongo_indexes.js

# 3. Seed sample feedback documents safely (non-destructive, preserves existing data)
node database/mongodb_seed.js
```

#### Run Comprehensive Verification Suite:
```bash
node scripts/test_mongodb_integration.js
```

### 2. Frontend & API Setup
```bash
cd studysync

# Install dependencies (if not already installed)
npm install

# Run Development Server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💾 DBMS Concepts Implemented

### 1. Relational Database Design (PostgreSQL)
- **Entities & Relationships in 3NF**:
  - `coordinators` (1:N with `courses`)
  - `students` (1:N with `availability`, M:N with `courses` through `enrollments`)
  - `study_groups` (1:N with `group_memberships` and `sessions`)
  - `group_memberships` (Composite primary key `(student_id, group_id)`, roles: `leader`, `member`)
  - `sessions` (Scheduled & completed group meetings)
  - `notifications` (User activity alerts)
- **Integrity Constraints**: Foreign keys with `ON DELETE CASCADE`, check constraints on ratings/capacities, unique constraints on user emails.

### 2. SQL Views (`database/views.sql`)
- `v_course_health_summary`: Calculates real-time course engagement metric based on enrollments, active cohorts, and completed sessions:
  $$\text{Health Score} = \min(100, \text{Students} \times 10 + \text{Groups} \times 20 + \text{Sessions} \times 15)$$
- `v_student_enrollments`: Aggregates student profiles, learning styles, and course metadata for coordinator reporting.
- `v_group_membership_overview`: Denormalizes study groups with leader details, member counts, and session frequencies.

### 3. Database Triggers (`database/triggers.sql`)
- `trg_check_group_capacity`: **BEFORE INSERT** trigger on `group_memberships`. Prevents joining a study group when `member_count >= max_members`.
- `trg_update_member_count`: **AFTER INSERT OR DELETE** trigger on `group_memberships`. Atomically maintains the cached `member_count` on `study_groups`.

### 4. Stored Procedures & Functions (`database/procedures.sql`)
- `fn_create_study_group(group_name, course_id, student_id, max_members)`: Atomically inserts a study group and automatically grants the creator the `leader` role inside a transaction.
- `fn_get_enrollment_stats(course_id)`: Generates breakdown of student skill tiers (`Beginner`, `Intermediate`, `Advanced`).
- `fn_get_group_stats()`: Reports total active vs. full study groups.

### 5. Polyglot Persistence & NoSQL Integration (MongoDB)
- MongoDB is employed for flexible, schema-less study session feedback (`session_feedback` collection).
- Accommodates varied dynamic fields (arrays of `topics_covered`, subjective comprehension levels, open-ended reflections).
- Aggregation pipeline calculates real-time course quality ratings:
  ```javascript
  db.session_feedback.aggregate([
    { $match: { course_id: { $in: courseIds } } },
    { $group: { _id: '$course_id', avgRating: { $avg: '$rating' }, totalFeedback: { $sum: 1 } } }
  ])
  ```

---

## 🧮 Compatibility Matching Algorithm

The smart study partner recommendation engine evaluates four normalized compatibility factors without machine learning overhead:

$$\text{Score} = 0.35 \times \text{Availability} + 0.30 \times \text{Skill} + 0.20 \times \text{Learning Style} + 0.15 \times \text{Shared Courses}$$

1. **Availability Overlap (35%)**: Time-interval overlap calculation across recurring weekly slots (Monday–Sunday).
2. **Skill Complementarity (30%)**: Pairs beginner students with intermediate/advanced mentors to encourage peer learning.
3. **VARK Learning Style Harmony (20%)**: Visual, Auditory, Read/Write, Kinesthetic compatibility matrix.
4. **Shared Course Enrollments (15%)**: Normalized intersection of mutual enrolled subjects.

---

## 🚀 Application Structure

### Student Portal
- **Dashboard** (`/student/dashboard`): Academic progress, enrolled courses, upcoming sessions, matching shortcut.
- **Profile** (`/student/profile`): Bio, VARK learning style selector, profile completeness rating.
- **My Courses** (`/student/courses`): Enrolled course cards, skill level declaration, course catalog browser.
- **Schedule** (`/student/availability`): Weekly time window manager for Monday–Sunday free hours.
- **Find Partners** (`/student/partners`): Compatibility ranked peer cards with breakdown metrics and filters.
- **Study Groups** (`/student/groups`): Cohort browser, capacity meters, create group modal, join/leave actions.
- **Sessions** (`/student/sessions`): Session scheduler, completion marker, MongoDB feedback modal with star ratings.
- **Notifications** (`/student/notifications`): Real-time activity alerts and mark-as-read controls.

### Coordinator Portal
- **Dashboard** (`/coordinator/dashboard`): High-level KPIs, course health matrix, skill distribution & learning style breakdown.
- **Curriculum** (`/coordinator/courses`): Create & manage courses, monitor student numbers per course.
- **Students Directory** (`/coordinator/students`): Searchable student table querying SQL View `v_student_enrollments`.
- **Groups Monitor** (`/coordinator/groups`): Study group utilization meters, capacity trigger tracking.
- **DBMS Analytics** (`/coordinator/analytics`): Deep dive into SQL Views, trigger definitions, and polyglot architecture.

---

## 🛠️ Setup & Execution Instructions

### 1. Database Setup
```bash
# PostgreSQL Setup
psql -U postgres -d postgres -c "CREATE DATABASE studysync;"
psql -U postgres -d studysync -f database/schema.sql
psql -U postgres -d studysync -f database/indexes.sql
psql -U postgres -d studysync -f database/triggers.sql
psql -U postgres -d studysync -f database/procedures.sql
psql -U postgres -d studysync -f database/views.sql
psql -U postgres -d studysync -f database/seed.sql

# MongoDB Setup
mongosh studysync database/mongodb_seed.js
```

### 2. Frontend & API Setup
```bash
cd studysync

# Generate Prisma Client
npx prisma generate

# Run Development Server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
