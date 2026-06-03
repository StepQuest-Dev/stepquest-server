import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

// Komenda npx ts-node prisma/seed.ts
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
  await prisma.discoveredPlace.deleteMany({});
  await prisma.raid.deleteMany({});
  await prisma.battle.deleteMany({});
  await prisma.combatSession.deleteMany({});
  await prisma.stepRecord.deleteMany({});
  await prisma.character.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.enemy.deleteMany({});
  await prisma.class.deleteMany({});

  console.log('🧹 Baza wyczyszczona.');

  // 1. Tworzymy użytkownika i od razu przypisaną do niego postać
  await prisma.class.createMany({
    data: [
      {
        name: 'Wojownik',
        description: 'Zahartowany w bitwach wojownik, który staje się groźniejszy gdy jest ranny.',
        baseHp: 120,
        baseAttack: 12,
        baseDefense: 8,
        hpPerLevel: 15,
        attackPerLevel: 2,
        defensePerLevel: 2,
        bonus: 'WARRIOR',
      },
      {
        name: 'Zwiadowca',
        description: 'Zwinny łowca, którego codzienna aktywność przekłada się na siłę w walce.',
        baseHp: 90,
        baseAttack: 15,
        baseDefense: 4,
        hpPerLevel: 10,
        attackPerLevel: 3,
        defensePerLevel: 1,
        bonus: 'SCOUT',
      },
      {
        name: 'Czarnoksiężnik',
        description: 'Mroczny mag gromadzący energię przez kilka tur, by wypuścić druzgocący cios.',
        baseHp: 80,
        baseAttack: 20,
        baseDefense: 2,
        hpPerLevel: 8,
        attackPerLevel: 4,
        defensePerLevel: 1,
        bonus: 'DOUBLE_STRIKE',
      },
      {
        name: 'Mnich',
        description: 'Ascetyczny wojownik o żelaznej woli. Niezniszczalny, lecz zadaje minimalne obrażenia — zwycięża przez przetrwanie.',
        baseHp: 1000,
        baseAttack: 1,
        baseDefense: 6,
        hpPerLevel: 20,
        attackPerLevel: 0,
        defensePerLevel: 1,
        bonus: 'MONK_REGEN',
      },
    ],
  });

  console.log('⚔️ Klasy utworzone.');

  // 1.5 Tworzymy Przedmioty
  await prisma.item.createMany({
    data: [
      {
        name: 'Skórzany Hełm',
        description: 'Podstawowa ochrona głowy.',
        type: 'ARMOR',
        slot: 'HEAD',
        defenseBonus: 2,
        price: 50,
      },
      {
        name: 'Skórzany Pancerz',
        description: 'Lekki pancerz dla początkujących.',
        type: 'ARMOR',
        slot: 'CHEST',
        defenseBonus: 5,
        price: 150,
      },
      {
        name: 'Zniszczony Miecz',
        description: 'Stary, zardzewiały miecz.',
        type: 'WEAPON',
        slot: 'WEAPON',
        attackBonus: 3,
        price: 30,
      },
      {
        name: 'Drewniana Tarcza',
        description: 'Prosta tarcza z desek.',
        type: 'ARMOR',
        slot: 'SHIELD',
        defenseBonus: 3,
        price: 40,
      },
      {
        name: 'Mikstura Zdrowia',
        description: 'Przywraca 20 HP.',
        type: 'CONSUMABLE',
        price: 25,
      },
    ],
  });

  console.log('📦 Przedmioty utworzone.');

  const passwordHash = await bcrypt.hash('Haslo123', 10);

  const warriorClass = await prisma.class.findUnique({
  where: { name: 'Wojownik' },
  });

  const user = await prisma.user.create({
    data: {
      email: 'test@test.com',
      username: 'UZ1',
      passwordHash,
      character: {
        create: {
          name: 'WojBody',
          level: 1,
          hp: warriorClass!.baseHp,
          maxHp: warriorClass!.baseHp,
          attack: warriorClass!.baseAttack,
          defense: warriorClass!.baseDefense,
          gold: 100,
          exp: 0,
          totalSteps: 0,
          classId: warriorClass!.id,
          inventory: {
            create: [
              {
                item: { connect: { id: (await prisma.item.findFirst({ where: { name: 'Skórzany Hełm' } }))!.id } },
                isEquipped: true,
              },
              {
                item: { connect: { id: (await prisma.item.findFirst({ where: { name: 'Skórzany Pancerz' } }))!.id } },
                isEquipped: true,
              },
              {
                item: { connect: { id: (await prisma.item.findFirst({ where: { name: 'Zniszczony Miecz' } }))!.id } },
                isEquipped: true,
              },
              {
                item: { connect: { id: (await prisma.item.findFirst({ where: { name: 'Drewniana Tarcza' } }))!.id } },
                isEquipped: true,
              },
              {
                item: { connect: { id: (await prisma.item.findFirst({ where: { name: 'Mikstura Zdrowia' } }))!.id } },
                quantity: 3,
              },
            ],
          },
        },
      },
    },
    include: { character: true },
  });

  console.log(`👤 Stworzono użytkownika: ${user.username} z postacią: ${user.character?.name}`);

  // 2. Tworzymy Przeciwników
  const goblin = await prisma.enemy.create({
    data: {
      name: 'Goblin',
      level: 1,
      hp: 50,
      attack: 10,
      defense: 2,
      goldReward: 15,
      expReward: 20,
      imageUrl: 'stepquest-app/assets/images/framed-icons/goblin-icon-ramka.png',
    },
  });

  const skeleton = await prisma.enemy.create({
    data: {
      name: 'Szkielet',
      level: 3,
      hp: 75,
      attack: 18,
      defense: 1,
      goldReward: 40,
      expReward: 55,
      imageUrl: 'stepquest-app/assets/images/framed-icons/goblin-icon-ramka.png',
    },
  });

  const boar = await prisma.enemy.create({
    data: {
      name: 'Dzik',
      level: 5,
      hp: 100,
      attack: 12,
      defense: 5,
      goldReward: 85,
      expReward: 130,
      imageUrl: 'stepquest-app/assets/images/framed-icons/goblin-icon-ramka.png',
    },
  });

  console.log('🌱 Baza danych została zasilona!');
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