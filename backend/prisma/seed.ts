import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing existing data...');
    await prisma.diagnosticService.deleteMany();
    await prisma.serviceCategory.deleteMany();
    await prisma.user.deleteMany();
    console.log('Cleared.');

    // ── Super Admin ─────────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
        data: {
            phone: '+998901234567',
            email: 'admin@medicare.uz',
            passwordHash: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            role: Role.SUPER_ADMIN,
        },
    });

    // ── Level 0: Root ────────────────────────────────────────────────────────
    const root = await prisma.serviceCategory.create({
        data: { nameUz: 'Diagnostika Xizmatlari', nameRu: 'Диагностические услуги', nameEn: 'Diagnostic Services', slug: 'diagnostics', level: 0, icon: '🔬', sortOrder: 0 },
    });

    // ── Level 1: Lab & Instrumental ──────────────────────────────────────────
    const lab = await prisma.serviceCategory.create({
        data: { nameUz: 'Laboratoriya Diagnostikasi', nameRu: 'Лабораторная диагностика', nameEn: 'Laboratory Diagnostics', slug: 'laboratory', level: 1, parentId: root.id, icon: '🧪', sortOrder: 1 },
    });
    const inst = await prisma.serviceCategory.create({
        data: { nameUz: 'Instrumental Diagnostika', nameRu: 'Инструментальная диагностика', nameEn: 'Instrumental Diagnostics', slug: 'instrumental', level: 1, parentId: root.id, icon: '🩺', sortOrder: 2 },
    });

    // ── Level 2: Lab subcategories ───────────────────────────────────────────
    const catQon = await prisma.serviceCategory.create({
        data: { nameUz: 'Qon Tahlillari', nameRu: 'Анализы крови', nameEn: 'Blood Tests', slug: 'blood-tests', level: 2, parentId: lab.id, icon: '🩸', sortOrder: 1 },
    });
    const catSiydik = await prisma.serviceCategory.create({
        data: { nameUz: 'Siydik Tahlillari', nameRu: 'Анализы мочи', nameEn: 'Urine Tests', slug: 'urine-tests', level: 2, parentId: lab.id, icon: '💧', sortOrder: 2 },
    });
    const catAxlat = await prisma.serviceCategory.create({
        data: { nameUz: 'Axlat va Ovqat Hazm Qilish', nameRu: 'Кал и пищеварение', nameEn: 'Stool & Digestion', slug: 'stool-digestion', level: 2, parentId: lab.id, icon: '💩', sortOrder: 3 },
    });
    const catRepro = await prisma.serviceCategory.create({
        data: { nameUz: "Reproduktiv Tizim Tahlillari", nameRu: 'Репродуктивная система', nameEn: 'Reproductive System', slug: 'reproductive', level: 2, parentId: lab.id, icon: '🔬', sortOrder: 4 },
    });
    const catMikro = await prisma.serviceCategory.create({
        data: { nameUz: 'Mikrobiologiya va Infeksiya', nameRu: 'Микробиология и инфекции', nameEn: 'Microbiology & Infections', slug: 'microbiology', level: 2, parentId: lab.id, icon: '🦠', sortOrder: 5 },
    });
    const catGenetik = await prisma.serviceCategory.create({
        data: { nameUz: 'Genetik va Molekulyar Diagnostika', nameRu: 'Генетика и молекулярная диагностика', nameEn: 'Genetic & Molecular', slug: 'genetics', level: 2, parentId: lab.id, icon: '🧬', sortOrder: 6 },
    });
    const catGormon = await prisma.serviceCategory.create({
        data: { nameUz: 'Gormonlar Tahlili', nameRu: 'Анализы гормонов', nameEn: 'Hormone Tests', slug: 'hormones', level: 2, parentId: lab.id, icon: '🔬', sortOrder: 7 },
    });
    const catImmun = await prisma.serviceCategory.create({
        data: { nameUz: 'Immunologiya', nameRu: 'Иммунология', nameEn: 'Immunology', slug: 'immunology', level: 2, parentId: lab.id, icon: '🛡️', sortOrder: 8 },
    });
    const catOnko = await prisma.serviceCategory.create({
        data: { nameUz: 'Onkologiya', nameRu: 'Онкология', nameEn: 'Oncology', slug: 'oncology', level: 2, parentId: lab.id, icon: '🧬', sortOrder: 9 },
    });
    const catMaxsus = await prisma.serviceCategory.create({
        data: { nameUz: 'Maxsus Tahlillar', nameRu: 'Специальные анализы', nameEn: 'Special Tests', slug: 'special-tests', level: 2, parentId: lab.id, icon: '🦴', sortOrder: 10 },
    });
    const catPrenatal = await prisma.serviceCategory.create({
        data: { nameUz: 'Prenatal Diagnostika', nameRu: 'Пренатальная диагностика', nameEn: 'Prenatal Diagnostics', slug: 'prenatal', level: 2, parentId: lab.id, icon: '🤰', sortOrder: 11 },
    });

    // ── Level 2: Instrumental subcategories ──────────────────────────────────
    const catTomo = await prisma.serviceCategory.create({
        data: { nameUz: 'Tomografiya', nameRu: 'Томография', nameEn: 'Tomography', slug: 'tomography', level: 2, parentId: inst.id, icon: '🧲', sortOrder: 1 },
    });
    const catRentgen = await prisma.serviceCategory.create({
        data: { nameUz: 'Rentgenologiya', nameRu: 'Рентгенология', nameEn: 'Radiology', slug: 'radiology', level: 2, parentId: inst.id, icon: '☢️', sortOrder: 2 },
    });
    const catUltratovush = await prisma.serviceCategory.create({
        data: { nameUz: 'Ultratovush', nameRu: 'Ультразвук', nameEn: 'Ultrasound', slug: 'ultrasound', level: 2, parentId: inst.id, icon: '🔊', sortOrder: 3 },
    });
    const catFunksional = await prisma.serviceCategory.create({
        data: { nameUz: 'Funksional Diagnostika', nameRu: 'Функциональная диагностика', nameEn: 'Functional Diagnostics', slug: 'functional', level: 2, parentId: inst.id, icon: '📈', sortOrder: 4 },
    });

    // ── 47 Diagnostic Services ───────────────────────────────────────────────
    const services = [
        // QON TAHLILLARI (10)
        { num: 1, catId: catQon.id, nameUz: 'Qon klinik tahlillari', nameRu: 'Клинический анализ крови', nameEn: 'Complete Blood Count', price: 50000, min: 40000, max: 70000, dur: 15, res: 2, sample: 'Venoz qon' },
        { num: 3, catId: catQon.id, nameUz: "Qon guruhi va Rezus tahlillari", nameRu: 'Анализ группы крови и резус-фактора', nameEn: 'Blood Group & Rh Factor', price: 60000, min: 50000, max: 80000, dur: 20, res: 4, sample: 'Venoz qon' },
        { num: 4, catId: catQon.id, nameUz: "Koagulogramma (Qon Ivish Tahlillari)", nameRu: 'Коагулограмма', nameEn: 'Coagulogram', price: 120000, min: 100000, max: 160000, dur: 30, res: 6, sample: 'Venoz qon' },
        { num: 5, catId: catQon.id, nameUz: "Lipidogramma (yog' almashinuvi skriningi)", nameRu: 'Липидограмма', nameEn: 'Lipid Profile', price: 90000, min: 75000, max: 120000, dur: 20, res: 6, sample: 'Venoz qon' },
        { num: 6, catId: catQon.id, nameUz: "Qon ivish tizimi tekshiruvlari (Koagulogramma)", nameRu: 'Исследование системы свертывания крови', nameEn: 'Coagulation Studies', price: 130000, min: 110000, max: 170000, dur: 30, res: 8, sample: 'Venoz qon' },
        { num: 7, catId: catQon.id, nameUz: 'Anemiya diagnostika', nameRu: 'Диагностика анемии', nameEn: 'Anemia Diagnostics', price: 85000, min: 70000, max: 110000, dur: 20, res: 6, sample: 'Venoz qon' },
        { num: 33, catId: catQon.id, nameUz: "Biokimyoviy qon testlari", nameRu: 'Биохимические анализы крови', nameEn: 'Blood Biochemistry Tests', price: 95000, min: 80000, max: 130000, dur: 25, res: 8, sample: 'Venoz qon' },
        { num: 35, catId: catQon.id, nameUz: "Qonning biokimyoviy tekshiruvlari", nameRu: 'Биохимические исследования крови', nameEn: 'Biochemical Blood Studies', price: 100000, min: 85000, max: 135000, dur: 25, res: 8, sample: 'Venoz qon' },
        { num: 42, catId: catQon.id, nameUz: "Autoimmun kasalliklar markerlari", nameRu: 'Маркеры аутоиммунных заболеваний', nameEn: 'Autoimmune Disease Markers', price: 150000, min: 130000, max: 200000, dur: 30, res: 24, sample: 'Venoz qon' },
        { num: 43, catId: catQon.id, nameUz: "Lipid spektri tahlillar (biokimyoviy qon tahlil)", nameRu: 'Анализ липидного спектра', nameEn: 'Lipid Spectrum Analysis', price: 110000, min: 90000, max: 150000, dur: 25, res: 8, sample: 'Venoz qon' },

        // SIYDIK TAHLILLARI (4)
        { num: 10, catId: catSiydik.id, nameUz: 'Siydikning klinik tahlillari', nameRu: 'Клинический анализ мочи', nameEn: 'Clinical Urine Analysis', price: 40000, min: 30000, max: 55000, dur: 15, res: 2, sample: 'Siydik' },
        { num: 11, catId: catSiydik.id, nameUz: 'Siydikning biokimyoviy tahlillari', nameRu: 'Биохимический анализ мочи', nameEn: 'Urine Biochemistry', price: 60000, min: 50000, max: 80000, dur: 20, res: 4, sample: 'Siydik' },
        { num: 12, catId: catSiydik.id, nameUz: 'Siydik tahlili (Sitologik Tekshiruv)', nameRu: 'Цитологическое исследование мочи', nameEn: 'Urine Cytology', price: 80000, min: 65000, max: 100000, dur: 20, res: 24, sample: 'Siydik' },
        { num: 36, catId: catSiydik.id, nameUz: 'Siydik tahlili (Umumiy Tahlillar)', nameRu: 'Общий анализ мочи', nameEn: 'General Urine Analysis', price: 35000, min: 25000, max: 50000, dur: 15, res: 2, sample: 'Siydik' },

        // AXLAT VA OVQAT HAZM QILISH (3)
        { num: 8, catId: catAxlat.id, nameUz: 'Ovqat hazm qilish va oshqozon tizimi', nameRu: 'Пищеварительная система', nameEn: 'Digestive System Tests', price: 70000, min: 55000, max: 90000, dur: 20, res: 4, sample: 'Axlat' },
        { num: 13, catId: catAxlat.id, nameUz: 'Axlatning klinik tahlil', nameRu: 'Клинический анализ кала', nameEn: 'Clinical Stool Analysis', price: 45000, min: 35000, max: 60000, dur: 15, res: 2, sample: 'Axlat' },
        { num: 14, catId: catAxlat.id, nameUz: 'Axlat tahlili (Koprogramma)', nameRu: 'Копрограмма', nameEn: 'Coprogramma', price: 50000, min: 40000, max: 65000, dur: 15, res: 4, sample: 'Axlat' },

        // REPRODUKTIV TIZIM (4)
        { num: 9, catId: catRepro.id, nameUz: 'Genital sistemani tekshirish (Urogen)', nameRu: 'Урогенитальное исследование', nameEn: 'Urogenital Examination', price: 90000, min: 75000, max: 120000, dur: 20, res: 4, sample: '' },
        { num: 15, catId: catRepro.id, nameUz: "Urug' suyuqligi tahlillari", nameRu: 'Спермограмма', nameEn: 'Spermogram', price: 100000, min: 85000, max: 130000, dur: 30, res: 4, sample: "Urug' suyuqligi" },
        { num: 18, catId: catRepro.id, nameUz: 'Ajralmalar klinik tahlil', nameRu: 'Клинический анализ выделений', nameEn: 'Discharge Analysis', price: 70000, min: 55000, max: 90000, dur: 20, res: 4, sample: 'Ajralma' },
        { num: 24, catId: catRepro.id, nameUz: 'Sperma tahlili', nameRu: 'Анализ спермы', nameEn: 'Semen Analysis', price: 110000, min: 90000, max: 145000, dur: 30, res: 6, sample: "Urug' suyuqligi" },

        // MIKROBIOLOGIYA (4)
        { num: 28, catId: catMikro.id, nameUz: 'Infeksiyalar', nameRu: 'Инфекции', nameEn: 'Infections', price: 95000, min: 80000, max: 125000, dur: 25, res: 48, sample: '' },
        { num: 29, catId: catMikro.id, nameUz: 'Yuqumli kasalliklar diagnostikasi', nameRu: 'Диагностика инфекционных болезней', nameEn: 'Infectious Disease Diagnostics', price: 120000, min: 100000, max: 160000, dur: 30, res: 48, sample: '' },
        { num: 32, catId: catMikro.id, nameUz: 'Bakteriologik tekshiruvlar antibiotiklarga sezuvchanlik', nameRu: 'Бактериологическое исследование с чувствительностью к антибиотикам', nameEn: 'Bacteriology & Antibiotic Sensitivity', price: 150000, min: 130000, max: 200000, dur: 30, res: 72, sample: '' },
        { num: 34, catId: catMikro.id, nameUz: "Mikroblarni o'rganish (Bakteriologiya)", nameRu: 'Бактериология', nameEn: 'Bacteriology', price: 130000, min: 110000, max: 170000, dur: 30, res: 72, sample: '' },

        // GENETIK (3)
        { num: 37, catId: catGenetik.id, nameUz: 'Genetik tahlillar', nameRu: 'Генетические анализы', nameEn: 'Genetic Tests', price: 300000, min: 250000, max: 400000, dur: 60, res: 168, sample: 'Venoz qon' },
        { num: 38, catId: catGenetik.id, nameUz: 'Infeksiyalarni (PCR Usulida) tahlil qilish', nameRu: 'Исследование инфекций методом ПЦР', nameEn: 'PCR Infection Analysis', price: 180000, min: 150000, max: 240000, dur: 30, res: 24, sample: 'Venoz qon / Yoqingh' },
        { num: 40, catId: catGenetik.id, nameUz: "Polimer zanjir reaksiyasi (PCR)", nameRu: 'Полимеразная цепная реакция (ПЦР)', nameEn: 'Polymerase Chain Reaction (PCR)', price: 170000, min: 140000, max: 220000, dur: 30, res: 24, sample: '' },

        // GORMONLAR (2)
        { num: 20, catId: catGormon.id, nameUz: 'Gormonlar tahlili (IXLA usuli)', nameRu: 'Анализ гормонов методом ИХЛА', nameEn: 'Hormone Analysis (IHCA)', price: 140000, min: 120000, max: 180000, dur: 30, res: 8, sample: 'Venoz qon' },
        { num: 41, catId: catGormon.id, nameUz: 'Qondagi Gormonlarni Tekshirish', nameRu: 'Исследование гормонов крови', nameEn: 'Blood Hormone Tests', price: 160000, min: 130000, max: 210000, dur: 30, res: 8, sample: 'Venoz qon' },

        // IMMUNOLOGIYA (5)
        { num: 25, catId: catImmun.id, nameUz: 'Allergologik tahlillar', nameRu: 'Аллергологические анализы', nameEn: 'Allergy Tests', price: 200000, min: 170000, max: 260000, dur: 30, res: 24, sample: 'Venoz qon' },
        { num: 27, catId: catImmun.id, nameUz: 'Immunitetni tekshirish', nameRu: 'Исследование иммунитета', nameEn: 'Immunity Tests', price: 180000, min: 150000, max: 240000, dur: 30, res: 24, sample: 'Venoz qon' },
        { num: 45, catId: catImmun.id, nameUz: 'Ekspress diagnostika (IFA)', nameRu: 'Экспресс-диагностика (ИФА)', nameEn: 'Express Diagnostics (ELISA)', price: 90000, min: 75000, max: 120000, dur: 20, res: 2, sample: '' },
        { num: 46, catId: catImmun.id, nameUz: 'Autoimmun tekshiruvlar', nameRu: 'Аутоиммунные исследования', nameEn: 'Autoimmune Studies', price: 220000, min: 190000, max: 290000, dur: 30, res: 24, sample: 'Venoz qon' },
        { num: 47, catId: catImmun.id, nameUz: 'Immunologik tahlillar', nameRu: 'Иммунологические анализы', nameEn: 'Immunological Tests', price: 200000, min: 170000, max: 265000, dur: 30, res: 24, sample: 'Venoz qon' },

        // ONKOLOGIYA (3)
        { num: 19, catId: catOnko.id, nameUz: 'Gistologik tekshiruv', nameRu: 'Гистологическое исследование', nameEn: 'Histological Examination', price: 250000, min: 210000, max: 330000, dur: 60, res: 72, sample: 'Biomaterial' },
        { num: 23, catId: catOnko.id, nameUz: 'Onkologik markerlar diagnostikasi', nameRu: 'Диагностика онкологических маркеров', nameEn: 'Oncological Markers', price: 180000, min: 150000, max: 240000, dur: 30, res: 24, sample: 'Venoz qon' },
        { num: 39, catId: catOnko.id, nameUz: 'Onkomarkerlar', nameRu: 'Онкомаркеры', nameEn: 'Tumor Markers', price: 160000, min: 130000, max: 210000, dur: 30, res: 24, sample: 'Venoz qon' },

        // MAXSUS TAHLILLAR (3)
        { num: 21, catId: catMaxsus.id, nameUz: 'Mikroskopik tahlillar', nameRu: 'Микроскопические исследования', nameEn: 'Microscopic Analyses', price: 80000, min: 65000, max: 105000, dur: 20, res: 4, sample: '' },
        { num: 22, catId: catMaxsus.id, nameUz: 'Mikroskopik teri tekshiruvlari', nameRu: 'Микроскопические исследования кожи', nameEn: 'Skin Microscopy', price: 90000, min: 75000, max: 120000, dur: 20, res: 4, sample: 'Teri qirindilar' },
        { num: 30, catId: catMaxsus.id, nameUz: 'Rеvmatologik tekshiruvlar', nameRu: 'Ревматологические исследования', nameEn: 'Rheumatological Tests', price: 140000, min: 120000, max: 185000, dur: 30, res: 24, sample: 'Venoz qon' },

        // PRENATAL (1)
        { num: 26, catId: catPrenatal.id, nameUz: 'Prenatal patologiya diagnostikasi', nameRu: 'Диагностика пренатальной патологии', nameEn: 'Prenatal Pathology Diagnostics', price: 350000, min: 300000, max: 450000, dur: 60, res: 48, sample: 'Venoz qon / Amniotik suyuqlik' },

        // ── INSTRUMENTAL ──────────────────────────────────────────────────────
        // TOMOGRAFIYA (1)
        { num: 2, catId: catTomo.id, nameUz: "POZITRON-EMISSION TOMOGRAFIYA (PET/KT)", nameRu: 'Позитронно-эмиссионная томография (ПЭТ/КТ)', nameEn: 'Positron Emission Tomography (PET/CT)', price: 2500000, min: 2000000, max: 3500000, dur: 90, res: 24, sample: '' },

        // RENTGENOLOGIYA (1)
        { num: 16, catId: catRentgen.id, nameUz: 'Rentgenologik tekshiruvlar', nameRu: 'Рентгенологические исследования', nameEn: 'X-Ray Examinations', price: 120000, min: 100000, max: 160000, dur: 30, res: 1, sample: '' },

        // ULTRATOVUSH (1)
        { num: 44, catId: catUltratovush.id, nameUz: 'Ultratovush va dopplerografiya', nameRu: 'Ультразвуковое исследование и допплерография', nameEn: 'Ultrasound & Dopplerography', price: 150000, min: 120000, max: 200000, dur: 40, res: 0.5, sample: '' },

        // FUNKSIONAL (2)
        { num: 17, catId: catFunksional.id, nameUz: 'Funksional va instrumental diagnostika', nameRu: 'Функциональная и инструментальная диагностика', nameEn: 'Functional & Instrumental Diagnostics', price: 130000, min: 110000, max: 170000, dur: 45, res: 1, sample: '' },
        { num: 31, catId: catFunksional.id, nameUz: 'Elektroensefalografiya (EEG)', nameRu: 'Электроэнцефалография (ЭЭГ)', nameEn: 'Electroencephalography (EEG)', price: 180000, min: 150000, max: 240000, dur: 60, res: 2, sample: '' },
    ];

    // Sort by service number before inserting
    services.sort((a, b) => a.num - b.num);

    for (const s of services) {
        await prisma.diagnosticService.create({
            data: {
                nameUz: s.nameUz,
                nameRu: s.nameRu,
                nameEn: s.nameEn,
                categoryId: s.catId,
                shortDescription: `${s.nameUz} bo'yicha laboratoriya tahlili.`,
                priceRecommended: s.price,
                priceMin: s.min,
                priceMax: s.max,
                durationMinutes: s.dur,
                resultTimeHours: s.res,
                sampleType: s.sample || undefined,
                isActive: true,
                createdById: admin.id,
            },
        });
        console.log(`  ✓ [${s.num}] ${s.nameUz}`);
    }

    console.log('\nSeeding Checkup Packages...');
    const qonKlinik = await prisma.diagnosticService.findFirst({ where: { nameUz: 'Qon klinik tahlillari' } });
    const siydikKlinik = await prisma.diagnosticService.findFirst({ where: { nameUz: 'Siydikning klinik tahlillari' } });
    const lipid = await prisma.diagnosticService.findFirst({ where: { nameUz: "Lipidogramma (yog' almashinuvi skriningi)" } });
    const gormon = await prisma.diagnosticService.findFirst({ where: { nameUz: 'Qondagi Gormonlarni Tekshirish' } });
    const rentgen = await prisma.diagnosticService.findFirst({ where: { nameUz: 'Rentgenologik tekshiruvlar' } });
    const ultra = await prisma.diagnosticService.findFirst({ where: { nameUz: 'Ultratovush va dopplerografiya' } });

    if (qonKlinik && siydikKlinik && ultra) {
        await prisma.checkupPackage.create({
            data: {
                nameUz: 'Bazaviy Checkup',
                nameRu: 'Базовый Чекап',
                slug: 'bazaviy-checkup',
                category: 'BASIC',
                shortDescription: "Asosiy tahlillar to'plami",
                recommendedPrice: 100000,
                priceMin: 80000,
                priceMax: 130000,
                discount: 20000,
                createdById: admin.id,
                items: {
                    create: [
                        { diagnosticServiceId: qonKlinik.id, serviceName: qonKlinik.nameUz, servicePrice: qonKlinik.priceRecommended, sortOrder: 0 },
                        { diagnosticServiceId: siydikKlinik.id, serviceName: siydikKlinik.nameUz, servicePrice: siydikKlinik.priceRecommended, sortOrder: 1 },
                        { diagnosticServiceId: ultra.id, serviceName: ultra.nameUz, servicePrice: ultra.priceRecommended, sortOrder: 2 },
                    ]
                }
            }
        });
    }

    if (lipid && rentgen && ultra) {
        await prisma.checkupPackage.create({
            data: {
                nameUz: 'Kardiologik Checkup',
                slug: 'kardiologik-checkup',
                category: 'SPECIALIZED',
                shortDescription: "Yurak qon-tomir kasalliklari skriningi",
                recommendedPrice: 620000,
                priceMin: 500000,
                priceMax: 700000,
                discount: 80000,
                createdById: admin.id,
                items: {
                    create: [
                        { diagnosticServiceId: lipid.id, serviceName: lipid.nameUz, servicePrice: lipid.priceRecommended, sortOrder: 0 },
                        { diagnosticServiceId: rentgen.id, serviceName: rentgen.nameUz, servicePrice: rentgen.priceRecommended, sortOrder: 1 },
                        { diagnosticServiceId: ultra.id, serviceName: ultra.nameUz, servicePrice: ultra.priceRecommended, sortOrder: 2 },
                    ]
                }
            }
        });
    }

    if (qonKlinik && lipid && ultra && gormon) {
        await prisma.checkupPackage.create({
            data: {
                nameUz: 'Erkaklar 40+ Checkup',
                slug: 'erkaklar-40-checkup',
                category: 'AGE_BASED',
                shortDescription: "40 yoshdan oshgan erkaklar uchun maxsus paket",
                recommendedPrice: 550000,
                priceMin: 450000,
                priceMax: 650000,
                discount: 80000,
                createdById: admin.id,
                items: {
                    create: [
                        { diagnosticServiceId: qonKlinik.id, serviceName: qonKlinik.nameUz, servicePrice: qonKlinik.priceRecommended, sortOrder: 0 },
                        { diagnosticServiceId: lipid.id, serviceName: lipid.nameUz, servicePrice: lipid.priceRecommended, sortOrder: 1 },
                        { diagnosticServiceId: ultra.id, serviceName: ultra.nameUz, servicePrice: ultra.priceRecommended, sortOrder: 2 },
                        { diagnosticServiceId: gormon.id, serviceName: gormon.nameUz, servicePrice: gormon.priceRecommended, sortOrder: 3 },
                    ]
                }
            }
        });
    }

    console.log(`\nSeed completed: ${services.length} services, 15 categories, 3 checkup packages created.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
