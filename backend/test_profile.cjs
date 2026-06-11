const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function test() {
  const admin = await prisma.user.findFirst({ where: { role: { name: "ADMIN" } }, include: { role: true } });
  if (!admin) return console.log("No admin found");
  try {
    const res = await prisma.user.findUnique({
        where: { id: admin.id },
        select: {
            id: true,
            sessions: {
                where: { isRevoked: false, expiresAt: { gt: new Date() } },
                select: { id: true }
            },
            auditLogs: { select: { id: true } },
            courseAssignments: { include: { course: true } },
            enrollments: { include: { section: true } },
            _count: {
                select: {
                    feedbackSubmissions: { where: { status: "COMPLETED" } },
                    auditLogs: true,
                    sessions: { where: { isRevoked: false, expiresAt: { gt: new Date() } } }
                }
            }
        }
    });
    console.log("Query successful", res);
  } catch (e) {
    console.error("Prisma Error:", e.message);
  }
}
test().catch(console.error).finally(() => prisma.$disconnect());
