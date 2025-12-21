import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Account: Michelin
  const michelin = await prisma.account.create({
    data: {
      name: 'Michelin',
      country: 'FR',
      tamName: 'Jean Dupont',
      domains: {
        create: [
          {
            name: 'michelin.fr',
            sitecode: 'A1B2C3D4',
            pages: {
              create: [
                { url: 'https://www.michelin.fr/' },
                { url: 'https://www.michelin.fr/pneus-auto' }
              ]
            }
          },
          {
            name: 'michelin.de',
            sitecode: 'E5F6G7H8',
            pages: {
              create: [
                { url: 'https://www.michelin.de/' }
              ]
            }
          }
        ]
      }
    }
  });

  // 2. Create Account: Toyota
  const toyota = await prisma.account.create({
    data: {
      name: 'Toyota',
      country: 'JP',
      tamName: 'Akira Tanaka',
      domains: {
        create: [
          {
            name: 'toyota.fr',
            pages: {
              create: [
                { url: 'https://www.toyota.fr/' },
                { url: 'https://www.toyota.fr/new-cars/yaris' }
              ]
            }
          }
        ]
      }
    }
  });

  // 3. Add some dummy analysis data for Michelin FR home page
  const michelinFrPage = await prisma.page.findFirst({ where: { url: 'https://www.michelin.fr/' } });
  
  if (michelinFrPage) {
    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await prisma.dailyAnalysis.create({
      data: {
        pageId: michelinFrPage.id,
        date: yesterday,
        tool: 'KAMELEOON',
        desktopCpuAvg: 120,
        mobileCpuAvg: 450,
        runCount: 5
      }
    });

    // Today
    await prisma.dailyAnalysis.create({
      data: {
        pageId: michelinFrPage.id,
        date: new Date(),
        tool: 'KAMELEOON',
        desktopCpuAvg: 115,
        mobileCpuAvg: 420,
        runCount: 5
      }
    });
    
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
