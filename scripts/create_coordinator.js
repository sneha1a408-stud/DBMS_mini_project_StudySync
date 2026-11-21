/**
 * StudySync - Administrative Coordinator Provisioning Tool
 * 
 * Usage:
 *   node scripts/create_coordinator.js "<Name>" "<Email>" "<Password>" "<Course1, Course2...>"
 * 
 * Examples:
 *   1. Assign existing courses:
 *      node scripts/create_coordinator.js "Prof. David Clark" "david.clark@studysync.edu" "Coordinator@123" "Operating Systems, Computer Networks"
 * 
 *   2. Create coordinator with a brand new course:
 *      node scripts/create_coordinator.js "Dr. Ada Lovelace" "ada.lovelace@studysync.edu" "Coordinator@123" "Compiler Design"
 */

const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require(path.join(__dirname, '../studysync/node_modules/@prisma/client'));
const bcrypt = require(path.join(__dirname, '../studysync/node_modules/bcryptjs'));

const prisma = new PrismaClient();

async function createCoordinator() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('='.repeat(70));
    console.log('STUDYSYNC - COORDINATOR CREATION TOOL');
    console.log('='.repeat(70));
    console.log('\nUsage:');
    console.log('  node scripts/create_coordinator.js "<Name>" "<Email>" "<Password>" "[Courses]"');
    console.log('\nExample:');
    console.log('  node scripts/create_coordinator.js "Prof. David Clark" "david.clark@studysync.edu" "Coordinator@123" "Computer Networks, Operating Systems"');
    process.exit(1);
  }

  const name = args[0].trim();
  const email = args[1].toLowerCase().trim();
  const password = args[2];
  const coursesInput = args[3] ? args[3].split(',').map((c) => c.trim()).filter(Boolean) : [];

  console.log('='.repeat(70));
  console.log('STUDYSYNC - PROVISIONING COORDINATOR ACCOUNT');
  console.log('='.repeat(70));
  console.log(`Name             : ${name}`);
  console.log(`Email            : ${email}`);
  console.log(`Password         : ${password}`);
  console.log(`Requested Courses: ${coursesInput.length > 0 ? coursesInput.join(', ') : 'None'}`);

  try {
    // 1. Check if email already exists
    const existing = await prisma.coordinator.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`\n❌ Error: Coordinator with email "${email}" already exists.`);
      console.log(`   ID: ${existing.coordinator_id}, Name: ${existing.name}`);
      process.exit(1);
    }

    // 2. Hash password using bcrypt (12 salt rounds)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Generate clean sequential ID: FAC-CS-00X
    const totalCoordinators = await prisma.coordinator.count();
    const coordinatorId = `FAC-CS-${String(totalCoordinators + 1).padStart(3, '0')}`;

    // 4. Insert coordinator
    const created = await prisma.coordinator.create({
      data: {
        coordinator_id: coordinatorId,
        name,
        email,
        password_hash: passwordHash,
      },
    });

    console.log(`\n✓ Coordinator created: ${created.name} (ID: ${created.coordinator_id})`);

    // 5. Assign or create requested courses
    const assignedCourses = [];
    if (coursesInput.length > 0) {
      console.log('\n--- Assigning Courses ---');
      for (const courseStr of coursesInput) {
        // Find existing course by name or ID (case-insensitive)
        const allCourses = await prisma.course.findMany();
        const found = allCourses.find(
          (c) => c.course_name.toLowerCase() === courseStr.toLowerCase() || c.course_id.toLowerCase() === courseStr.toLowerCase()
        );

        if (found) {
          // Reassign existing course
          await prisma.course.update({
            where: { course_id: found.course_id },
            data: { coordinator_id: created.coordinator_id },
          });
          console.log(`  ✓ Reassigned existing course: "${found.course_name}" -> ${created.name}`);
          assignedCourses.push(found.course_name);
        } else {
          // Create new course for this coordinator
          const newCourseId = crypto.randomUUID();
          const newCourse = await prisma.course.create({
            data: {
              course_id: newCourseId,
              course_name: courseStr,
              department: 'Computer Science',
              semester: 'Fall 2024',
              coordinator_id: created.coordinator_id,
              description: `Curriculum study track for ${courseStr}.`,
            },
          });
          console.log(`  + Created and assigned new course: "${newCourse.course_name}" -> ${created.name}`);
          assignedCourses.push(newCourse.course_name);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('COORDINATOR PROVISIONED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log(`Coordinator ID   : ${created.coordinator_id}`);
    console.log(`Name             : ${created.name}`);
    console.log(`Email            : ${created.email}`);
    console.log(`Assigned Courses : ${assignedCourses.length > 0 ? assignedCourses.join(', ') : 'None'}`);
    console.log('\nYou can now log in at http://localhost:3000/login using:');
    console.log(`  Tab     : 👩‍🏫 Coordinator`);
    console.log(`  Email   : ${created.email}`);
    console.log(`  Password: ${password}`);

  } catch (err) {
    console.error('\n❌ Provisioning failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createCoordinator();
