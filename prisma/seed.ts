import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// 1. Ładujemy zmienne środowiskowe
dotenv.config();

// 2. Konfigurujemy połączenie dla adaptera
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Rozpoczynanie profesjonalnego seedowania...');

  // Czyszczenie bazy (kolejność usuwania jest ważna ze względu na klucze obce!)
  // Najpierw tabele zależne, na końcu User i Enemy
  await prisma.battle.deleteMany({});
  await prisma.stepRecord.deleteMany({});
  await prisma.character.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.enemy.deleteMany({});

  console.log('🧹 Baza wyczyszczona.');

  // 1. Tworzymy użytkownika i od razu przypisaną do niego postać
  const user = await prisma.user.create({
    data: {
      email: 'test@test.com',
      username: 'UZ1',
      passwordHash: 'Haslo123', // Tu wleci hash gdy dodasz auth
      character: {
        create: {
          name: 'WojBody',
          level: 1,
          hp: 100,
          maxHp: 100,
          attack: 15,
          defense: 5,
          gold: 100,
          exp: 0,
          totalSteps: 0,
        },
      },
    },
    include: {
      character: true,
    },
  });

  console.log(`👤 Stworzono użytkownika: ${user.username} z postacią: ${user.character?.name}`);

  // 2. Tworzymy Goblina (z Twoim konkretnym ID)
  const enemy = await prisma.enemy.create({
    data: {
      id: '495f98e0-c31b-40c9-8dfd-58b66d187e9b',
      name: 'Goblin',
      level: 1,
      hp: 50,
      attack: 10,
      defense: 2,
      goldReward: 15,
      expReward: 20,
    },
  });

  console.log('🌱 Baza danych została zasilona!');
  console.log('-----------------------------------');
  console.log('Ważne ID do testów walki:');
  console.log(`Character ID: ${user.character?.id}`);
  console.log(`Enemy ID:     ${enemy.id}`);
  console.log('-----------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Błąd podczas seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Zamykamy pulę połączeń adaptera
  });