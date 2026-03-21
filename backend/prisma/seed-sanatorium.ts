import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!admin) { console.error('No admin found'); return; }

    // Clean old sanatorium data
    await prisma.clinicSanatoriumService.deleteMany();
    await prisma.sanatoriumService.deleteMany();
    const old = await prisma.serviceCategory.findFirst({ where: { slug: 'sanatorium', level: 0 } });
    if (old) {
        const del = async (pid: string) => {
            const ch = await prisma.serviceCategory.findMany({ where: { parentId: pid } });
            for (const c of ch) await del(c.id);
            await prisma.serviceCategory.deleteMany({ where: { parentId: pid } });
        };
        await del(old.id);
        await prisma.serviceCategory.delete({ where: { id: old.id } });
    }

    // ── Root (Level 0) ──────────────────────────────────────────────────────
    const root = await prisma.serviceCategory.create({
        data: { nameUz: 'Sanatoriya xizmatlari', nameRu: 'Санаторные услуги', slug: 'sanatorium', level: 0, icon: '🏥', sortOrder: 3 },
    });

    // ── Level 1 ─────────────────────────────────────────────────────────────
    const accom = await prisma.serviceCategory.create({ data: { nameUz: 'Turar joy', nameRu: 'Проживание', slug: 'san-accommodation', level: 1, parentId: root.id, icon: '🛏', sortOrder: 1 } });
    const medical = await prisma.serviceCategory.create({ data: { nameUz: 'Tibbiy protseduralar', nameRu: 'Медицинские процедуры', slug: 'san-medical', level: 1, parentId: root.id, icon: '💆', sortOrder: 2 } });
    const nutrition = await prisma.serviceCategory.create({ data: { nameUz: 'Ovqatlanish', nameRu: 'Питание', slug: 'san-nutrition', level: 1, parentId: root.id, icon: '🍽', sortOrder: 3 } });
    const programs = await prisma.serviceCategory.create({ data: { nameUz: 'Dasturlar', nameRu: 'Программы', slug: 'san-programs', level: 1, parentId: root.id, icon: '🎯', sortOrder: 4 } });

    // ── Level 2: Turar joy ──────────────────────────────────────────────────
    const stdRooms = await prisma.serviceCategory.create({ data: { nameUz: 'Standart Xonalar', slug: 'san-rooms-standard', level: 2, parentId: accom.id, icon: '•', sortOrder: 1 } });
    const comfRooms = await prisma.serviceCategory.create({ data: { nameUz: 'Komfort Xonalar', slug: 'san-rooms-comfort', level: 2, parentId: accom.id, icon: '•', sortOrder: 2 } });
    const luxRooms = await prisma.serviceCategory.create({ data: { nameUz: 'Lux Xonalar', slug: 'san-rooms-lux', level: 2, parentId: accom.id, icon: '•', sortOrder: 3 } });
    const premRooms = await prisma.serviceCategory.create({ data: { nameUz: 'Premium Xonalar', slug: 'san-rooms-premium', level: 2, parentId: accom.id, icon: '•', sortOrder: 4 } });

    // ── Level 2: Tibbiy protseduralar ───────────────────────────────────────
    const physio = await prisma.serviceCategory.create({ data: { nameUz: 'Fizioterapiya', slug: 'san-physiotherapy', level: 2, parentId: medical.id, icon: '•', sortOrder: 1 } });
    const massage = await prisma.serviceCategory.create({ data: { nameUz: 'Massaj Terapiyasi', slug: 'san-massage', level: 2, parentId: medical.id, icon: '•', sortOrder: 2 } });
    const balneo = await prisma.serviceCategory.create({ data: { nameUz: 'Balneoterapiya', slug: 'san-balneotherapy', level: 2, parentId: medical.id, icon: '•', sortOrder: 3 } });
    const mud = await prisma.serviceCategory.create({ data: { nameUz: 'Gryazoterapiya', slug: 'san-mud-therapy', level: 2, parentId: medical.id, icon: '•', sortOrder: 4 } });
    const inhal = await prisma.serviceCategory.create({ data: { nameUz: 'Ingalyatsiya', slug: 'san-inhalation', level: 2, parentId: medical.id, icon: '•', sortOrder: 5 } });
    const hirudo = await prisma.serviceCategory.create({ data: { nameUz: 'Girudoterapiya', slug: 'san-hirudotherapy', level: 2, parentId: medical.id, icon: '•', sortOrder: 6 } });

    // ── Level 2: Ovqatlanish ────────────────────────────────────────────────
    const mealPlans = await prisma.serviceCategory.create({ data: { nameUz: 'Ovqatlanish Rejimlari', slug: 'san-meal-plans', level: 2, parentId: nutrition.id, icon: '•', sortOrder: 1 } });
    const dietPlans = await prisma.serviceCategory.create({ data: { nameUz: 'Dietik Ovqatlanish', slug: 'san-diet-plans', level: 2, parentId: nutrition.id, icon: '•', sortOrder: 2 } });
    const specialMenu = await prisma.serviceCategory.create({ data: { nameUz: 'Maxsus Dasturlar', slug: 'san-special-menu', level: 2, parentId: nutrition.id, icon: '•', sortOrder: 3 } });

    // ── Level 2: Dasturlar ──────────────────────────────────────────────────
    const treatProgs = await prisma.serviceCategory.create({ data: { nameUz: 'Davolash Dasturlari', slug: 'san-treatment-programs', level: 2, parentId: programs.id, icon: '•', sortOrder: 1 } });
    const wellProgs = await prisma.serviceCategory.create({ data: { nameUz: 'Wellness Dasturlar', slug: 'san-wellness-programs', level: 2, parentId: programs.id, icon: '•', sortOrder: 2 } });
    const restPkgs = await prisma.serviceCategory.create({ data: { nameUz: 'Dam Olish Paketlari', slug: 'san-rest-packages', level: 2, parentId: programs.id, icon: '•', sortOrder: 3 } });

    // ── Services ────────────────────────────────────────────────────────────
    const svc = (data: any) => prisma.sanatoriumService.create({ data: { ...data, createdById: admin.id } });

    // -- Standart Xonalar --
    await svc({ nameUz: '1 kishilik xona (standart)', categoryId: stdRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 250000, priceMin: 200000, priceMax: 350000, pricePer: 'night', capacity: 1 });
    await svc({ nameUz: '2 kishilik xona (standart)', categoryId: stdRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 400000, priceMin: 300000, priceMax: 500000, pricePer: 'night', capacity: 2 });
    await svc({ nameUz: '3 kishilik xona (standart)', categoryId: stdRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 500000, priceMin: 400000, priceMax: 650000, pricePer: 'night', capacity: 3 });
    await svc({ nameUz: '4 kishilik xona (oilaviy)', categoryId: stdRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 600000, priceMin: 500000, priceMax: 800000, pricePer: 'night', capacity: 4 });

    // -- Komfort Xonalar --
    await svc({ nameUz: '1 kishilik xona (komfort)', categoryId: comfRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 450000, priceMin: 350000, priceMax: 600000, pricePer: 'night', capacity: 1 });
    await svc({ nameUz: '2 kishilik xona (komfort)', categoryId: comfRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 650000, priceMin: 500000, priceMax: 800000, pricePer: 'night', capacity: 2 });
    await svc({ nameUz: 'Junior Suite', categoryId: comfRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 900000, priceMin: 700000, priceMax: 1200000, pricePer: 'night', capacity: 2 });

    // -- Lux Xonalar --
    await svc({ nameUz: 'Lux 1 kishilik', categoryId: luxRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 800000, priceMin: 600000, priceMax: 1000000, pricePer: 'night', capacity: 1 });
    await svc({ nameUz: 'Lux 2 kishilik', categoryId: luxRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 1200000, priceMin: 900000, priceMax: 1500000, pricePer: 'night', capacity: 2 });
    await svc({ nameUz: 'Suite (lyuks)', categoryId: luxRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 1800000, priceMin: 1400000, priceMax: 2500000, pricePer: 'night', capacity: 2 });

    // -- Premium Xonalar --
    await svc({ nameUz: 'Prezident Suite', categoryId: premRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 3000000, priceMin: 2500000, priceMax: 5000000, pricePer: 'night', capacity: 2 });
    await svc({ nameUz: 'Family Suite (oilaviy lyuks)', categoryId: premRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 2500000, priceMin: 2000000, priceMax: 4000000, pricePer: 'night', capacity: 4 });
    await svc({ nameUz: 'VIP Villa', categoryId: premRooms.id, serviceType: 'ACCOMMODATION', priceRecommended: 5000000, priceMin: 4000000, priceMax: 8000000, pricePer: 'night', capacity: 6 });

    // -- Fizioterapiya --
    await svc({ nameUz: 'Elektroterapiya (Amplipuls, Diadinamik)', categoryId: physio.id, serviceType: 'MEDICAL', priceRecommended: 80000, priceMin: 50000, priceMax: 120000, pricePer: 'session', durationMinutes: 20 });
    await svc({ nameUz: 'Magnit terapiya', categoryId: physio.id, serviceType: 'MEDICAL', priceRecommended: 70000, priceMin: 40000, priceMax: 100000, pricePer: 'session', durationMinutes: 15 });
    await svc({ nameUz: 'Lazer terapiya', categoryId: physio.id, serviceType: 'MEDICAL', priceRecommended: 90000, priceMin: 60000, priceMax: 130000, pricePer: 'session', durationMinutes: 15 });
    await svc({ nameUz: 'Ultratovush terapiya', categoryId: physio.id, serviceType: 'MEDICAL', priceRecommended: 75000, priceMin: 50000, priceMax: 110000, pricePer: 'session', durationMinutes: 15 });
    await svc({ nameUz: 'UVCh terapiya', categoryId: physio.id, serviceType: 'MEDICAL', priceRecommended: 60000, priceMin: 40000, priceMax: 90000, pricePer: 'session', durationMinutes: 10 });
    await svc({ nameUz: 'Parafin terapiya', categoryId: physio.id, serviceType: 'MEDICAL', priceRecommended: 85000, priceMin: 50000, priceMax: 120000, pricePer: 'session', durationMinutes: 30 });
    await svc({ nameUz: 'Ozokerit terapiya', categoryId: physio.id, serviceType: 'MEDICAL', priceRecommended: 85000, priceMin: 50000, priceMax: 120000, pricePer: 'session', durationMinutes: 30 });
    await svc({ nameUz: 'Darsonvalizatsiya', categoryId: physio.id, serviceType: 'MEDICAL', priceRecommended: 65000, priceMin: 40000, priceMax: 100000, pricePer: 'session', durationMinutes: 15 });

    // -- Massaj --
    await svc({ nameUz: "Klassik massaj (to'liq tana)", categoryId: massage.id, serviceType: 'MEDICAL', priceRecommended: 200000, priceMin: 150000, priceMax: 350000, pricePer: 'session', durationMinutes: 60 });
    await svc({ nameUz: 'Terapevtik massaj', categoryId: massage.id, serviceType: 'MEDICAL', priceRecommended: 180000, priceMin: 120000, priceMax: 280000, pricePer: 'session', durationMinutes: 45 });
    await svc({ nameUz: 'Limfodrenaj massaj', categoryId: massage.id, serviceType: 'MEDICAL', priceRecommended: 220000, priceMin: 150000, priceMax: 350000, pricePer: 'session', durationMinutes: 60 });
    await svc({ nameUz: 'Antisellyulit massaj', categoryId: massage.id, serviceType: 'MEDICAL', priceRecommended: 250000, priceMin: 180000, priceMax: 400000, pricePer: 'session', durationMinutes: 50 });
    await svc({ nameUz: 'Orqa-bel massaji', categoryId: massage.id, serviceType: 'MEDICAL', priceRecommended: 120000, priceMin: 80000, priceMax: 200000, pricePer: 'session', durationMinutes: 30 });
    await svc({ nameUz: "Bo'yin-yelka massaji", categoryId: massage.id, serviceType: 'MEDICAL', priceRecommended: 100000, priceMin: 60000, priceMax: 180000, pricePer: 'session', durationMinutes: 25 });
    await svc({ nameUz: 'Oyoq massaji', categoryId: massage.id, serviceType: 'MEDICAL', priceRecommended: 100000, priceMin: 60000, priceMax: 180000, pricePer: 'session', durationMinutes: 30 });
    await svc({ nameUz: 'Bosh-yuz massaji', categoryId: massage.id, serviceType: 'MEDICAL', priceRecommended: 90000, priceMin: 50000, priceMax: 150000, pricePer: 'session', durationMinutes: 20 });

    // -- Balneoterapiya --
    await svc({ nameUz: 'Mineral vannalar', categoryId: balneo.id, serviceType: 'MEDICAL', priceRecommended: 150000, priceMin: 100000, priceMax: 250000, pricePer: 'session', durationMinutes: 20 });
    await svc({ nameUz: 'Khvoyli vannalar (ignabargli)', categoryId: balneo.id, serviceType: 'MEDICAL', priceRecommended: 160000, priceMin: 100000, priceMax: 250000, pricePer: 'session', durationMinutes: 20 });
    await svc({ nameUz: 'Aromavannalar', categoryId: balneo.id, serviceType: 'MEDICAL', priceRecommended: 170000, priceMin: 120000, priceMax: 280000, pricePer: 'session', durationMinutes: 25 });
    await svc({ nameUz: 'Zhemchug vannalar (pearl bath)', categoryId: balneo.id, serviceType: 'MEDICAL', priceRecommended: 180000, priceMin: 120000, priceMax: 300000, pricePer: 'session', durationMinutes: 20 });
    await svc({ nameUz: 'Gidromassaj vannalar', categoryId: balneo.id, serviceType: 'MEDICAL', priceRecommended: 200000, priceMin: 150000, priceMax: 350000, pricePer: 'session', durationMinutes: 20 });
    await svc({ nameUz: 'Charcot dush (dush-massaj)', categoryId: balneo.id, serviceType: 'MEDICAL', priceRecommended: 130000, priceMin: 80000, priceMax: 200000, pricePer: 'session', durationMinutes: 10 });
    await svc({ nameUz: 'Sharko dushi', categoryId: balneo.id, serviceType: 'MEDICAL', priceRecommended: 120000, priceMin: 80000, priceMax: 200000, pricePer: 'session', durationMinutes: 10 });
    await svc({ nameUz: 'Tsirkulyar dush', categoryId: balneo.id, serviceType: 'MEDICAL', priceRecommended: 110000, priceMin: 70000, priceMax: 180000, pricePer: 'session', durationMinutes: 10 });

    // -- Gryazoterapiya --
    await svc({ nameUz: 'Umumiy gryaze aplikatsiya', categoryId: mud.id, serviceType: 'MEDICAL', priceRecommended: 200000, priceMin: 150000, priceMax: 350000, pricePer: 'session', durationMinutes: 30 });
    await svc({ nameUz: "Mahalliy gryaze (orqa, bo'g'imlar)", categoryId: mud.id, serviceType: 'MEDICAL', priceRecommended: 150000, priceMin: 100000, priceMax: 250000, pricePer: 'session', durationMinutes: 20 });
    await svc({ nameUz: "Gryaze obertivanie (o'rash)", categoryId: mud.id, serviceType: 'MEDICAL', priceRecommended: 250000, priceMin: 180000, priceMax: 400000, pricePer: 'session', durationMinutes: 40 });
    await svc({ nameUz: 'Sapropel terapiya', categoryId: mud.id, serviceType: 'MEDICAL', priceRecommended: 180000, priceMin: 120000, priceMax: 300000, pricePer: 'session', durationMinutes: 25 });

    // -- Ingalyatsiya --
    await svc({ nameUz: 'Mineral suv ingalyatsiyasi', categoryId: inhal.id, serviceType: 'MEDICAL', priceRecommended: 60000, priceMin: 30000, priceMax: 100000, pricePer: 'session', durationMinutes: 10 });
    await svc({ nameUz: "Fitoingalyatsiya (o'simlik)", categoryId: inhal.id, serviceType: 'MEDICAL', priceRecommended: 65000, priceMin: 35000, priceMax: 100000, pricePer: 'session', durationMinutes: 10 });
    await svc({ nameUz: 'Tuz ingalyatsiyasi (Galoterapiya)', categoryId: inhal.id, serviceType: 'MEDICAL', priceRecommended: 80000, priceMin: 50000, priceMax: 130000, pricePer: 'session', durationMinutes: 30 });
    await svc({ nameUz: 'Efir moylari bilan', categoryId: inhal.id, serviceType: 'MEDICAL', priceRecommended: 55000, priceMin: 30000, priceMax: 90000, pricePer: 'session', durationMinutes: 10 });

    // -- Girudoterapiya --
    await svc({ nameUz: 'Zuluk terapiyasi (5-7 ta)', categoryId: hirudo.id, serviceType: 'MEDICAL', priceRecommended: 250000, priceMin: 180000, priceMax: 400000, pricePer: 'session', durationMinutes: 45 });
    await svc({ nameUz: 'Zuluk terapiyasi (10-12 ta)', categoryId: hirudo.id, serviceType: 'MEDICAL', priceRecommended: 400000, priceMin: 300000, priceMax: 600000, pricePer: 'session', durationMinutes: 60 });
    await svc({ nameUz: "To'liq kurs (20+ zuluk)", categoryId: hirudo.id, serviceType: 'MEDICAL', priceRecommended: 700000, priceMin: 500000, priceMax: 1000000, pricePer: 'course', sessionsCount: 5, durationMinutes: 60 });

    // -- Ovqatlanish Rejimlari --
    await svc({ nameUz: '3 mahal ovqat (standart)', categoryId: mealPlans.id, serviceType: 'NUTRITION', priceRecommended: 150000, priceMin: 100000, priceMax: 250000, pricePer: 'day' });
    await svc({ nameUz: '3 mahal ovqat + kofe breyk', categoryId: mealPlans.id, serviceType: 'NUTRITION', priceRecommended: 200000, priceMin: 150000, priceMax: 300000, pricePer: 'day' });
    await svc({ nameUz: "4 mahal ovqat (to'liq pansion)", categoryId: mealPlans.id, serviceType: 'NUTRITION', priceRecommended: 250000, priceMin: 180000, priceMax: 350000, pricePer: 'day' });
    await svc({ nameUz: "All Inclusive (hammasi qo'shilgan)", categoryId: mealPlans.id, serviceType: 'NUTRITION', priceRecommended: 400000, priceMin: 300000, priceMax: 600000, pricePer: 'day' });

    // -- Dietik Ovqatlanish --
    await svc({ nameUz: 'Stol №1 (oshqozon kasalliklari)', categoryId: dietPlans.id, serviceType: 'NUTRITION', priceRecommended: 200000, priceMin: 150000, priceMax: 300000, pricePer: 'day' });
    await svc({ nameUz: "Stol №5 (jigar, ot yo'llari)", categoryId: dietPlans.id, serviceType: 'NUTRITION', priceRecommended: 200000, priceMin: 150000, priceMax: 300000, pricePer: 'day' });
    await svc({ nameUz: 'Stol №8 (ortiqcha vazn)', categoryId: dietPlans.id, serviceType: 'NUTRITION', priceRecommended: 220000, priceMin: 160000, priceMax: 320000, pricePer: 'day' });
    await svc({ nameUz: 'Stol №9 (qandli diabet)', categoryId: dietPlans.id, serviceType: 'NUTRITION', priceRecommended: 220000, priceMin: 160000, priceMax: 320000, pricePer: 'day' });
    await svc({ nameUz: 'Stol №10 (yurak-qon tomirlari)', categoryId: dietPlans.id, serviceType: 'NUTRITION', priceRecommended: 220000, priceMin: 160000, priceMax: 320000, pricePer: 'day' });
    await svc({ nameUz: 'Individual ratsion', categoryId: dietPlans.id, serviceType: 'NUTRITION', priceRecommended: 350000, priceMin: 250000, priceMax: 500000, pricePer: 'day' });

    // -- Maxsus Dasturlar (Nutrition) --
    await svc({ nameUz: 'Detoks dasturi', categoryId: specialMenu.id, serviceType: 'NUTRITION', priceRecommended: 300000, priceMin: 200000, priceMax: 450000, pricePer: 'day' });
    await svc({ nameUz: 'Vegetarian menyu', categoryId: specialMenu.id, serviceType: 'NUTRITION', priceRecommended: 200000, priceMin: 150000, priceMax: 300000, pricePer: 'day' });
    await svc({ nameUz: 'Vegan menyu', categoryId: specialMenu.id, serviceType: 'NUTRITION', priceRecommended: 220000, priceMin: 160000, priceMax: 320000, pricePer: 'day' });
    await svc({ nameUz: 'Gluten-free menyu', categoryId: specialMenu.id, serviceType: 'NUTRITION', priceRecommended: 250000, priceMin: 180000, priceMax: 380000, pricePer: 'day' });

    // -- Davolash Dasturlari --
    await svc({ nameUz: 'Muskuloskelet tizim reabilitatsiya', categoryId: treatProgs.id, serviceType: 'PROGRAM', priceRecommended: 5000000, priceMin: 3500000, priceMax: 8000000, pricePer: 'package', durationDays: 14, sessionsCount: 20 });
    await svc({ nameUz: 'Yurak-qon tomirlari reabilitatsiya', categoryId: treatProgs.id, serviceType: 'PROGRAM', priceRecommended: 6000000, priceMin: 4000000, priceMax: 9000000, pricePer: 'package', durationDays: 14, sessionsCount: 18 });
    await svc({ nameUz: 'Nerv tizimi tiklash', categoryId: treatProgs.id, serviceType: 'PROGRAM', priceRecommended: 5500000, priceMin: 3500000, priceMax: 8000000, pricePer: 'package', durationDays: 14, sessionsCount: 16 });
    await svc({ nameUz: 'Oshqozon-ichak davolash', categoryId: treatProgs.id, serviceType: 'PROGRAM', priceRecommended: 4500000, priceMin: 3000000, priceMax: 7000000, pricePer: 'package', durationDays: 10, sessionsCount: 14 });
    await svc({ nameUz: "Nafas yo'llari davolash", categoryId: treatProgs.id, serviceType: 'PROGRAM', priceRecommended: 4000000, priceMin: 2500000, priceMax: 6000000, pricePer: 'package', durationDays: 10, sessionsCount: 12 });
    await svc({ nameUz: 'Ginekologik davolash', categoryId: treatProgs.id, serviceType: 'PROGRAM', priceRecommended: 5000000, priceMin: 3500000, priceMax: 8000000, pricePer: 'package', durationDays: 12, sessionsCount: 15 });
    await svc({ nameUz: 'Urolog kasalliklar', categoryId: treatProgs.id, serviceType: 'PROGRAM', priceRecommended: 5000000, priceMin: 3500000, priceMax: 8000000, pricePer: 'package', durationDays: 12, sessionsCount: 14 });
    await svc({ nameUz: 'Post-COVID reabilitatsiya', categoryId: treatProgs.id, serviceType: 'PROGRAM', priceRecommended: 5500000, priceMin: 3500000, priceMax: 8500000, pricePer: 'package', durationDays: 14, sessionsCount: 18 });

    // -- Wellness Dasturlar --
    await svc({ nameUz: 'Antistress dastur (7-14 kun)', categoryId: wellProgs.id, serviceType: 'PROGRAM', priceRecommended: 4000000, priceMin: 2500000, priceMax: 7000000, pricePer: 'package', durationDays: 10, sessionsCount: 12 });
    await svc({ nameUz: 'Detoks dastur (7-10 kun)', categoryId: wellProgs.id, serviceType: 'PROGRAM', priceRecommended: 3500000, priceMin: 2000000, priceMax: 5500000, pricePer: 'package', durationDays: 7, sessionsCount: 10 });
    await svc({ nameUz: 'Vazn kamaytirish (14-21 kun)', categoryId: wellProgs.id, serviceType: 'PROGRAM', priceRecommended: 6000000, priceMin: 4000000, priceMax: 9000000, pricePer: 'package', durationDays: 18, sessionsCount: 25 });
    await svc({ nameUz: 'Yoshartirish (Anti-age) (10-14 kun)', categoryId: wellProgs.id, serviceType: 'PROGRAM', priceRecommended: 7000000, priceMin: 5000000, priceMax: 10000000, pricePer: 'package', durationDays: 12, sessionsCount: 18 });
    await svc({ nameUz: 'Energiya tiklash (5-7 kun)', categoryId: wellProgs.id, serviceType: 'PROGRAM', priceRecommended: 2500000, priceMin: 1500000, priceMax: 4000000, pricePer: 'package', durationDays: 6, sessionsCount: 8 });
    await svc({ nameUz: 'Immunitet oshirish (10-14 kun)', categoryId: wellProgs.id, serviceType: 'PROGRAM', priceRecommended: 4500000, priceMin: 3000000, priceMax: 7000000, pricePer: 'package', durationDays: 12, sessionsCount: 15 });

    // -- Dam Olish Paketlari --
    await svc({ nameUz: 'Dam olish MINI (2-3 kun)', categoryId: restPkgs.id, serviceType: 'PROGRAM', priceRecommended: 1500000, priceMin: 1000000, priceMax: 2500000, pricePer: 'package', durationDays: 3 });
    await svc({ nameUz: 'Dam olish STANDART (5-7 kun)', categoryId: restPkgs.id, serviceType: 'PROGRAM', priceRecommended: 3500000, priceMin: 2500000, priceMax: 5000000, pricePer: 'package', durationDays: 6 });
    await svc({ nameUz: 'Dam olish OPTIMUM (10-14 kun)', categoryId: restPkgs.id, serviceType: 'PROGRAM', priceRecommended: 6000000, priceMin: 4000000, priceMax: 8500000, pricePer: 'package', durationDays: 12 });
    await svc({ nameUz: 'Dam olish MAKSIMUM (21 kun)', categoryId: restPkgs.id, serviceType: 'PROGRAM', priceRecommended: 9000000, priceMin: 7000000, priceMax: 13000000, pricePer: 'package', durationDays: 21 });

    console.log('✅ Sanatorium categories & services seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
