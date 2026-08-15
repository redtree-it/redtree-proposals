import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/password";
import { getDataDir } from "../lib/env";

// Reusable/generic content lifted from the real reference document
// (`Managed Service Proposal Template.docx`) — client-specific text from that
// document (About You, Executive Summary, requirements) is deliberately left
// out since it belonged to a one-off proposal, not the shared library.
const BLOCKS: { title: string; category: string; bodyMarkdown: string }[] = [
  {
    title: "About Us",
    category: "INTRODUCTION",
    bodyMarkdown:
      "Redtree IT are Tech driven, and Client focused with more than 20 years of experience in providing high quality IT Support and Consultancy. We provide clients with a quality technical service, with an onus on proactive support, but also guiding them towards making the very best use of what's available to help them make their business as effective and secure as possible.",
  },
  {
    title: "Unlimited Support",
    category: "EXPERIENCE",
    bodyMarkdown:
      "Redtree are your outsourced IT team, so we work as you would expect an internal team to work. We don't limit the amount of support you get. If we are needed on site then we will be there, no limits, no additional charges, no surprises.",
  },
  {
    title: "Predictable Costs",
    category: "EXPERIENCE",
    bodyMarkdown:
      "We offer a straightforward pricing model with a flat monthly fee per user, ensuring transparency and predictability in your IT support costs. As your team size changes, so do your support costs — if the number of staff decreases, your fees adjust accordingly. This flexible approach allows you to effectively plan and manage your IT budget throughout the year, providing peace of mind and financial clarity.",
  },
  {
    title: "Simple Communication",
    category: "EXPERIENCE",
    bodyMarkdown:
      "Our Tech Team understand that they are supporting people who use technology, not just the technology itself. We communicate with you in plain English, not technical jargon, and focus on building trusting relationships with end users. We recognise that technology is a tool meant to assist in completing tasks, not create obstacles.",
  },
  {
    title: "Your Experience",
    category: "EXPERIENCE",
    bodyMarkdown:
      "As you get to trust Redtree as your new provider, we will ensure our best practices are put in place and your reliance on reactive support will reduce. Redtree will then offer a truly proactive experience where your systems are monitored and adapted against the current security landscape.\n\nWe will schedule regular Solutions Review Meetings where we can understand any changes within your organisation and the fast-moving product changes in the IT industry. These meetings are to ensure you get the best out of your technology and the partnership with Redtree IT.",
  },
  {
    title: "Our Values",
    category: "VALUES",
    bodyMarkdown:
      "We are committed to an open and transparent approach in all aspects of our business. Our goal is to provide a truly unlimited support experience, placing you, the client, at the core of every decision we make.\n\nCollaboration is key to our success. All our engineers, regardless of seniority, are customer-facing. This ensures that you develop personal relationships with the individuals responsible for maintaining and supporting your systems, creating a more seamless and trusted experience.\n\nContinuous learning and development are fundamental to our team's success. We invest in ongoing training to ensure our engineers remain at the forefront of the ever-evolving technology landscape, equipping them to better serve your business now and in the future.",
  },
  {
    title: "Technology",
    category: "EXPERTISE",
    bodyMarkdown:
      "We become your IT team, each client is unique in their requirements from an IT department, but with over twenty years of experience we can provide exactly what you are looking for.\n\nRedtree will manage your technology systems and support your staff while also advising your leadership on current risks, trends and developments within the industry.",
  },
  {
    title: "Security",
    category: "EXPERTISE",
    bodyMarkdown:
      "Security is at the heart of all Redtree technology implementations. We will ensure you achieve a standard of security that will reduce the risk that is in any IT systems.\n\nAs the risk landscape changes our team will develop your security posture to keep you ahead of new threats.",
  },
  {
    title: "Productivity",
    category: "EXPERTISE",
    bodyMarkdown:
      "Redtree will ensure your teams have a technology solution that does not create barriers. Production hours will always be productive as IT issues become a thing of the past.",
  },
  {
    title: "Efficiency",
    category: "EXPERTISE",
    bodyMarkdown: "New technology developments drive efficiency, Redtree will ensure you stay ahead of the curve.",
  },
  {
    title: "Meet the Team",
    category: "ONBOARDING",
    bodyMarkdown:
      "We know that changing IT provider can be a daunting task. First and foremost, we assign every new client with a dedicated onboarding manager to ensure the whole onboarding process goes smoothly and you are well looked after. You will receive a detailed onboarding plan outlining all the key steps to ensure a smooth hassle-free transition.",
  },
  {
    title: "IT Change Over",
    category: "ONBOARDING",
    bodyMarkdown:
      "It's important that from day one of switching over to Redtree there is a positive impact felt by the whole business, to achieve this, we will have several team members onsite for an initial onboarding day to ensure the following steps are completed:\n\n- Taking control of everything from your current IT provider\n- Rolling out our support and management software\n- Populating our Documentation platform (IT Glue) to ensure all our team know everything about you and your IT infrastructure",
  },
  {
    title: "The Early Days",
    category: "ONBOARDING",
    bodyMarkdown:
      "We will be busy working though any outstanding issues and completing lots of proactive maintenance to ensure you're all secure and working correctly. During the first few weeks of being a client you will have lots of contact with our Service Desk and Technical Consultants.",
  },
  {
    title: "The IT Review",
    category: "ONBOARDING",
    bodyMarkdown:
      "We will then start on your IT review. This will provide you with a complete overview of your IT Infrastructure, and includes sound recommendations that will form the basis of your IT roadmap which is an essential part of your IT plan for the coming 12-18 months.",
  },
  {
    title: "Cardiff City FC",
    category: "TESTIMONIALS",
    bodyMarkdown:
      '"Redtree are our IT Support company of choice. They look after the Football Stadium, our training ground and the Academy. The team at Redtree are extremely knowledgeable, helpful, quick responding and pro-active. I would definitely recommend them as a technology partner."\n\n— Chris Arthur, Cardiff City FC',
  },
  {
    title: "R&M Williams",
    category: "TESTIMONIALS",
    bodyMarkdown:
      '"Moving to Redtree helped us not only secure but also simplify our IT systems. Their technical support is quicker than anything we have previously experienced."\n\n— Milena Bednarova, R&M Williams',
  },
  {
    title: "Afanti Media TV",
    category: "TESTIMONIALS",
    bodyMarkdown:
      '"Redtree makes our business work better. Your whole team are doing something right so please don\'t change the way you do it!"\n\n— Emyr Afan, Afanti Media TV',
  },
  {
    title: "Complete Background Screening",
    category: "TESTIMONIALS",
    bodyMarkdown:
      '"We have relied on Redtree for almost a decade. They give superb service, are easily contactable and are quick to respond. It\'s refreshing to have a provider that feels like they are a part of our team."\n\n— Rachel Bedgood, Complete Background Screening',
  },
  {
    title: "Next Steps",
    category: "NEXT_STEPS",
    bodyMarkdown:
      "Ready to get started? Here's what happens next:\n\n- We'll schedule a short call to confirm scope and answer any questions\n- We'll agree a start date and onboarding plan together\n- Your dedicated onboarding manager will take it from there",
  },
];

const PRICE_BOOK_ITEMS: {
  name: string;
  description?: string;
  unitType: "PER_USER" | "PER_DEVICE" | "FIXED";
  category: "CORE" | "PHASE_2";
}[] = [
  { name: "IT Support Services", description: "Unlimited remote and onsite support", unitType: "PER_USER", category: "CORE" },
  { name: "Remote Endpoint Protection (REP)", description: "Antivirus, web protection, patch management", unitType: "PER_DEVICE", category: "CORE" },
  { name: "SaaS Protection", description: "Backup for Microsoft 365", unitType: "PER_USER", category: "CORE" },
  { name: "Microsoft 365 Business Premium", unitType: "PER_USER", category: "CORE" },
  { name: "Microsoft 365 Business Basic", unitType: "PER_USER", category: "CORE" },
  { name: "Microsoft 365 Defender P1", unitType: "PER_USER", category: "CORE" },
  { name: "Email Security Testing & Training", description: "IronScales anti-phishing + training", unitType: "PER_USER", category: "PHASE_2" },
  { name: "Managed EDR", description: "SentinelOne endpoint detection & response", unitType: "PER_DEVICE", category: "PHASE_2" },
];

async function seedLogo(): Promise<string> {
  const source = path.join(__dirname, "seed-assets", "redtree-logo.png");
  const bytes = readFileSync(source);
  const uploadsDir = path.join(getDataDir(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filename = `${randomUUID()}.png`;
  await writeFile(path.join(uploadsDir, filename), bytes);
  return filename;
}

async function main() {
  const existingSettings = await prisma.companySettings.findUnique({ where: { id: "singleton" } });
  if (!existingSettings?.logoPath) {
    const logoPath = await seedLogo();
    await prisma.companySettings.upsert({
      where: { id: "singleton" },
      update: { logoPath },
      create: { id: "singleton", logoPath },
    });
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@redtree-it.co.uk" },
    update: {},
    create: {
      email: "admin@redtree-it.co.uk",
      name: "Admin Demo",
      role: "ADMIN",
      passwordHash: hashPassword("password123"),
    },
  });

  await prisma.user.upsert({
    where: { email: "user@redtree-it.co.uk" },
    update: {},
    create: {
      email: "user@redtree-it.co.uk",
      name: "User Demo",
      role: "USER",
      passwordHash: hashPassword("password123"),
    },
  });

  const alreadySeeded = (await prisma.contentBlock.count()) > 0;
  if (alreadySeeded) {
    console.log("Content blocks already exist — skipping block/template/price-book/demo seeding.");
    return;
  }

  const createdBlocks: { id: string; title: string; versionId: string }[] = [];
  for (const [index, block] of BLOCKS.entries()) {
    const created = await prisma.contentBlock.create({
      data: {
        title: block.title,
        category: block.category as never,
        sortOrder: index,
        versions: { create: { versionNo: 1, bodyMarkdown: block.bodyMarkdown, createdById: admin.id } },
      },
      include: { versions: true },
    });
    await prisma.contentBlock.update({
      where: { id: created.id },
      data: { currentVersionId: created.versions[0].id },
    });
    createdBlocks.push({ id: created.id, title: created.title, versionId: created.versions[0].id });
  }

  const template = await prisma.template.create({
    data: {
      name: "Standard Managed Service",
      description: "The default block set for a new managed service proposal.",
      blocks: {
        create: createdBlocks.map((block, index) => ({ blockId: block.id, sortOrder: index })),
      },
    },
  });

  for (const [index, item] of PRICE_BOOK_ITEMS.entries()) {
    await prisma.priceBookItem.create({
      data: {
        name: item.name,
        description: item.description,
        unitPricePence: 0,
        unitType: item.unitType,
        category: item.category,
        defaultIncluded: item.category === "CORE",
        sortOrder: index,
      },
    });
  }

  const demoClient = await prisma.client.create({
    data: {
      name: "Beacons Cymru",
      contactName: "Luke",
      email: "luke@example.com",
      sector: "Charity",
      userCount: 2,
      deviceCount: 12,
      notes: "BYOD, currently on Google Workspace with no formal IT support in place.",
    },
  });

  await prisma.proposal.create({
    data: {
      clientId: demoClient.id,
      title: "Managed IT Proposal",
      templateId: template.id,
      status: "DRAFT",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      blocks: {
        create: createdBlocks.map((block, index) => ({
          sourceBlockId: block.id,
          sourceVersionId: block.versionId,
          title: block.title,
          bodyMarkdown: BLOCKS[index].bodyMarkdown,
          sortOrder: index,
        })),
      },
      activities: { create: { userId: admin.id, action: "CREATED", detail: "Created from template" } },
    },
  });

  console.log(`Seeded ${createdBlocks.length} blocks, 1 template, ${PRICE_BOOK_ITEMS.length} price book items, 2 users, 1 demo client + proposal.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
