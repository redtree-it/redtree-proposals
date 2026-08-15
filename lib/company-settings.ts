import { prisma } from "./db";

export async function getCompanySettings() {
  return prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {},
  });
}
