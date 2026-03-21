import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Stable fake IDs for cached service references
const sid = (name: string) =>
    'seed-svc-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

type ItemDef = { name: string; price: number; cat: string };

async function createPackage(
    adminId: string,
    pkg: {
        nameUz: string;
        nameRu?: string;
        slug: string;
        category: 'BASIC' | 'SPECIALIZED' | 'AGE_BASED';
        shortDescription?: string;
        targetAudience?: string;
        recommendedPrice: number;
        priceMin: number;
        priceMax: number;
        items: ItemDef[];
    }
) {
    const total = pkg.items.reduce((s, i) => s + i.price, 0);
    const discount = Math.max(0, total - pkg.recommendedPrice);

    await prisma.checkupPackage.create({
        data: {
            nameUz: pkg.nameUz,
            nameRu: pkg.nameRu,
            slug: pkg.slug,
            category: pkg.category,
            shortDescription: pkg.shortDescription,
            targetAudience: pkg.targetAudience,
            recommendedPrice: pkg.recommendedPrice,
            priceMin: pkg.priceMin,
            priceMax: pkg.priceMax,
            discount: discount,
            isActive: true,
            createdById: adminId,
            items: {
                create: pkg.items.map((item, idx) => ({
                    diagnosticServiceId: sid(item.name),
                    serviceName: item.name,
                    servicePrice: item.price,
                    notes: item.cat,
                    quantity: 1,
                    isRequired: true,
                    sortOrder: idx,
                })),
            },
        },
    });

    console.log(
        `  ✓ ${pkg.nameUz.padEnd(35)} | ${pkg.items.length} xizmat | ` +
        `${pkg.recommendedPrice.toLocaleString().padStart(11)} UZS` +
        (discount > 0 ? ` | -${discount.toLocaleString()} tejash` : '')
    );
}

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!admin) { console.error('❌ SUPER_ADMIN topilmadi. Avval seed.ts ni ishlatib ko\'ring.'); return; }
    const adminId = admin.id;

    // ── Clean ─────────────────────────────────────────────────────────────────
    console.log('\n🗑️  Eski paketlar o\'chirilmoqda...');
    await prisma.checkupPackageItem.deleteMany();
    await prisma.checkupPackage.deleteMany();
    console.log('   Done.\n');

    // ─────────────────────────────────────────────────────────────────────────
    // 📦 BAZAVIY (BASIC) — 4 paket
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📦 BAZAVIY paketlar yaratilmoqda...');

    await createPackage(adminId, {
        nameUz: 'Asosiy Checkup',
        nameRu: 'Базовый Чекап',
        slug: 'asosiy-checkup',
        category: 'BASIC',
        shortDescription: '18+ barcha yoshdagilar uchun to\'liq asosiy tekshiruv',
        targetAudience: '18+ barcha yoshdagilar',
        recommendedPrice: 380_000,
        priceMin: 340_000,
        priceMax: 440_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Qon glyukozasi', price: 20_000, cat: 'Laboratoriya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'USG qorin bo\'shlig\'i', price: 120_000, cat: 'Ultratovush' },
            { name: 'Arterial bosim o\'lchash', price: 10_000, cat: 'Instrumental' },
            { name: 'Terapevt konsultatsiyasi', price: 100_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Ekspres Checkup',
        nameRu: 'Экспресс Чекап',
        slug: 'ekspres-checkup',
        category: 'BASIC',
        shortDescription: 'Tezkor asosiy ko\'rsatkichlar tekshiruvi',
        targetAudience: 'Vaqti cheklangan odamlar',
        recommendedPrice: 240_000,
        priceMin: 210_000,
        priceMax: 270_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'Qon glyukozasi', price: 20_000, cat: 'Laboratoriya' },
            { name: 'USG qorin bo\'shlig\'i', price: 120_000, cat: 'Ultratovush' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Profilaktik Checkup',
        nameRu: 'Профилактический Чекап',
        slug: 'profilaktik-checkup',
        category: 'BASIC',
        shortDescription: 'Yillik profilaktik tekshiruv kompleksi',
        targetAudience: 'Yillik ko\'rik uchun',
        recommendedPrice: 320_000,
        priceMin: 285_000,
        priceMax: 365_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'Ko\'krak rentgeni', price: 60_000, cat: 'Instrumental' },
            { name: 'Arterial bosim o\'lchash', price: 10_000, cat: 'Instrumental' },
            { name: 'Terapevt konsultatsiyasi', price: 100_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Mini Checkup',
        nameRu: 'Мини Чекап',
        slug: 'mini-checkup',
        category: 'BASIC',
        shortDescription: 'Asosiy ko\'rsatkichlar — tez va arzon',
        targetAudience: 'Dastlabki sog\'liq bahosi',
        recommendedPrice: 150_000,
        priceMin: 130_000,
        priceMax: 175_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
        ],
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 🎯 IXTISOSLASHGAN (SPECIALIZED) — 10 paket
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n🎯 IXTISOSLASHGAN paketlar yaratilmoqda...');

    await createPackage(adminId, {
        nameUz: 'Kardiologik Checkup',
        nameRu: 'Кардиологический Чекап',
        slug: 'kardiologik-checkup',
        category: 'SPECIALIZED',
        shortDescription: 'Yurak-qon tomir tizimini chuqur tekshirish',
        targetAudience: 'Yurak kasalliklari xavfi bo\'lganlar',
        recommendedPrice: 620_000,
        priceMin: 560_000,
        priceMax: 710_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'EXO-KG (exokardiografiya)', price: 150_000, cat: 'Ultratovush' },
            { name: 'Holter monitoringi (24 soat)', price: 200_000, cat: 'Instrumental' },
            { name: 'Koagulogramma', price: 60_000, cat: 'Laboratoriya' },
            { name: 'Lipidogramma', price: 70_000, cat: 'Laboratoriya' },
            { name: 'Kardiolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Gastroenterologik Checkup',
        nameRu: 'Гастроэнтерологический Чекап',
        slug: 'gastroenterologik-checkup',
        category: 'SPECIALIZED',
        shortDescription: 'Oshqozon-ichak tizimini to\'liq tekshirish',
        targetAudience: 'Oshqozon-ichak muammolari bo\'lganlar',
        recommendedPrice: 1_100_000,
        priceMin: 990_000,
        priceMax: 1_260_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'ALT/AST fermentlari', price: 40_000, cat: 'Laboratoriya' },
            { name: 'Bilirubin (umumiy/to\'g\'ri)', price: 40_000, cat: 'Laboratoriya' },
            { name: 'FGDS (fibrogastroduodenoskopiya)', price: 200_000, cat: 'Endoskopiya' },
            { name: 'Kolonoskopiya', price: 250_000, cat: 'Endoskopiya' },
            { name: 'USG qorin bo\'shlig\'i', price: 120_000, cat: 'Ultratovush' },
            { name: 'Helikobakter pylori testi', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Axlat umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Lipaza va Amilaza', price: 60_000, cat: 'Laboratoriya' },
            { name: 'Gastroenterolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Nevrologik Checkup',
        nameRu: 'Неврологический Чекап',
        slug: 'nevrologik-checkup',
        category: 'SPECIALIZED',
        shortDescription: 'Nerv tizimi va bosh miya tekshiruvi',
        targetAudience: 'Bosh og\'riq, uyqu buzilishi, nerv muammolari',
        recommendedPrice: 850_000,
        priceMin: 760_000,
        priceMax: 975_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'MRT bosh miya', price: 350_000, cat: 'MRT' },
            { name: 'EEG (elektroentsefalografiya)', price: 80_000, cat: 'Instrumental' },
            { name: 'Bosh miya tomirlar Doppleri', price: 120_000, cat: 'Ultratovush' },
            { name: 'Ko\'z tubi tekshiruvi', price: 50_000, cat: 'Oftatmologiya' },
            { name: 'Reoentsefalografiya', price: 60_000, cat: 'Instrumental' },
            { name: 'Nevrolog konsultatsiyasi', price: 120_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Ortopedik Checkup',
        nameRu: 'Ортопедический Чекап',
        slug: 'ortopedik-checkup',
        category: 'SPECIALIZED',
        shortDescription: 'Qo\'shimcha-harakat tizimi tekshiruvi',
        targetAudience: 'Bo\'g\'im og\'rig\'i, umurtqa muammolari',
        recommendedPrice: 680_000,
        priceMin: 610_000,
        priceMax: 780_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Umurtqa rentgeni (2 proektsiya)', price: 80_000, cat: 'Rentgen' },
            { name: 'MRT bo\'g\'im', price: 250_000, cat: 'MRT' },
            { name: 'Densitometriya (suyak zichligi)', price: 100_000, cat: 'Instrumental' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Ortoped-travmatolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Pulmunologik Checkup',
        nameRu: 'Пульмонологический Чекап',
        slug: 'pulmunologik-checkup',
        category: 'SPECIALIZED',
        shortDescription: 'O\'pka va nafas yo\'llari kasalliklarini tekshirish',
        targetAudience: 'O\'pka kasalliklari, nafas qisilishi',
        recommendedPrice: 720_000,
        priceMin: 645_000,
        priceMax: 825_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Spirometriya (FVD)', price: 80_000, cat: 'Instrumental' },
            { name: 'Ko\'krak qafasi rentgeni', price: 60_000, cat: 'Rentgen' },
            { name: 'Ko\'krak qafasi KT', price: 250_000, cat: 'KT' },
            { name: 'Qon gazlari tahlili (pulsoksimetriya)', price: 80_000, cat: 'Instrumental' },
            { name: 'Pulmunolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Oftalmologik Checkup',
        nameRu: 'Офтальмологический Чекап',
        slug: 'oftalmologik-checkup',
        category: 'SPECIALIZED',
        shortDescription: 'Ko\'z sog\'lig\'ini to\'liq tekshirish',
        targetAudience: 'Ko\'z kasalliklari, ko\'rish buzilishi',
        recommendedPrice: 580_000,
        priceMin: 520_000,
        priceMax: 665_000,
        items: [
            { name: 'Vizometriya (ko\'rish o\'tkirligi)', price: 30_000, cat: 'Oftalmologiya' },
            { name: 'Tonometriya (ko\'z ichki bosimi)', price: 30_000, cat: 'Oftalmologiya' },
            { name: 'OCT (optik kogerent tomografiya)', price: 150_000, cat: 'Oftalmologiya' },
            { name: 'Biomikroskopiya', price: 50_000, cat: 'Oftalmologiya' },
            { name: 'Ko\'z tubi tekshiruvi', price: 50_000, cat: 'Oftalmologiya' },
            { name: 'Refraktometriya', price: 40_000, cat: 'Oftalmologiya' },
            { name: 'Perimetriya (ko\'rish maydoni)', price: 70_000, cat: 'Oftalmologiya' },
            { name: 'Kampimetriya', price: 60_000, cat: 'Oftalmologiya' },
            { name: 'Oftalmolog konsultatsiyasi', price: 130_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Stomatologik Checkup',
        nameRu: 'Стоматологический Чекап',
        slug: 'stomatologik-checkup',
        category: 'SPECIALIZED',
        shortDescription: 'Tish va og\'iz bo\'shlig\'i sog\'lig\'ini tekshirish',
        targetAudience: 'Tish muammolari, profilaktik ko\'rik',
        recommendedPrice: 420_000,
        priceMin: 375_000,
        priceMax: 480_000,
        items: [
            { name: 'Ortopantomogramma (panoram rentgen)', price: 80_000, cat: 'Rentgen' },
            { name: 'Tish rentgeni (2 ta)', price: 50_000, cat: 'Rentgen' },
            { name: 'Parodontologik tekshiruv', price: 60_000, cat: 'Stomatologiya' },
            { name: 'Tish emalining diagnostikasi', price: 70_000, cat: 'Stomatologiya' },
            { name: 'Kariyes detektori test', price: 50_000, cat: 'Stomatologiya' },
            { name: 'Stomatolog konsultatsiyasi', price: 120_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Endokrinologik Checkup',
        nameRu: 'Эндокринологический Чекап',
        slug: 'endokrinologik-checkup',
        category: 'SPECIALIZED',
        shortDescription: 'Endokrin bezlar va gormonlar holati tekshiruvi',
        targetAudience: 'Qalqonsimon bez, diabet, semirish muammolari',
        recommendedPrice: 780_000,
        priceMin: 700_000,
        priceMax: 895_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Qon glyukozasi', price: 20_000, cat: 'Laboratoriya' },
            { name: 'T3, T4, TTG gormonlari', price: 120_000, cat: 'Laboratoriya' },
            { name: 'Insulin va C-peptid', price: 80_000, cat: 'Laboratoriya' },
            { name: 'USG qalqonsimon bez', price: 90_000, cat: 'Ultratovush' },
            { name: 'HbA1c (glikozillangan gemoglobin)', price: 70_000, cat: 'Laboratoriya' },
            { name: 'Gormonlar kompleksi', price: 250_000, cat: 'Laboratoriya' },
            { name: 'Endokrinolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Onkologik Skrining',
        nameRu: 'Онкологический Скрининг',
        slug: 'onkologik-skrining',
        category: 'SPECIALIZED',
        shortDescription: 'Saraton kasalligini erta aniqlash tekshiruvi',
        targetAudience: '40+ saraton erta aniqlash',
        recommendedPrice: 1_200_000,
        priceMin: 1_080_000,
        priceMax: 1_380_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Onkomarkerlar (PSA, CEA, CA-125, AFP)', price: 200_000, cat: 'Laboratoriya' },
            { name: 'Ko\'krak qafasi KT', price: 350_000, cat: 'KT' },
            { name: 'MRT qorin bo\'shlig\'i', price: 350_000, cat: 'MRT' },
            { name: 'USG qorin bo\'shlig\'i', price: 120_000, cat: 'Ultratovush' },
            { name: 'Koagulogramma', price: 60_000, cat: 'Laboratoriya' },
            { name: 'Limfotsit subtip tahlili', price: 120_000, cat: 'Laboratoriya' },
            { name: 'Kolonoskopiya', price: 250_000, cat: 'Endoskopiya' },
            { name: 'Onkolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Allergologik Checkup',
        nameRu: 'Аллергологический Чекап',
        slug: 'allergologik-checkup',
        category: 'SPECIALIZED',
        shortDescription: 'Allergiya va immunitet holati tekshiruvi',
        targetAudience: 'Allergiya, astma, immunitet muammolari',
        recommendedPrice: 650_000,
        priceMin: 585_000,
        priceMax: 745_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Total IgE', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Allergo panel keng (ImmunoCAP)', price: 200_000, cat: 'Laboratoriya' },
            { name: 'Eozinofillar tahlili', price: 40_000, cat: 'Laboratoriya' },
            { name: 'Teri allergy testlari (skin prick)', price: 120_000, cat: 'Laboratoriya' },
            { name: 'Nasal provokatsiya testi', price: 60_000, cat: 'Instrumental' },
            { name: 'Rinoskopiya', price: 50_000, cat: 'Instrumental' },
            { name: 'Allergolog-immunolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 👥 YOSH GURUHIGA OID (AGE_BASED) — 9 paket
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n👥 YOSH GURUHI paketlar yaratilmoqda...');

    await createPackage(adminId, {
        nameUz: 'Erkaklar 40+ Checkup',
        nameRu: 'Чекап для мужчин 40+',
        slug: 'erkaklar-40-checkup',
        category: 'AGE_BASED',
        shortDescription: '40 yoshdan oshgan erkaklar uchun chuqur tekshiruv',
        targetAudience: '40+ yoshdagi erkaklar',
        recommendedPrice: 950_000,
        priceMin: 855_000,
        priceMax: 1_090_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'USG qorin bo\'shlig\'i', price: 120_000, cat: 'Ultratovush' },
            { name: 'USG prostata bezi', price: 100_000, cat: 'Ultratovush' },
            { name: 'Gormonlar kompleksi (testosteron, LH, FSH)', price: 250_000, cat: 'Laboratoriya' },
            { name: 'PSA (prostata-spetsifik antigen)', price: 80_000, cat: 'Laboratoriya' },
            { name: 'VICh, Gepatit B/C markerlari', price: 120_000, cat: 'Laboratoriya' },
            { name: 'Lipidogramma', price: 70_000, cat: 'Laboratoriya' },
            { name: 'Qon glyukozasi', price: 20_000, cat: 'Laboratoriya' },
            { name: 'Urolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Ayollar Checkup',
        nameRu: 'Женский Чекап',
        slug: 'ayollar-checkup',
        category: 'AGE_BASED',
        shortDescription: '18+ ayollar uchun reproduktiv sog\'liq tekshiruvi',
        targetAudience: '18+ yoshdagi ayollar',
        recommendedPrice: 780_000,
        priceMin: 700_000,
        priceMax: 895_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'PAP-test (onkositologiya)', price: 80_000, cat: 'Laboratoriya' },
            { name: 'VPCh (papillomavirus) tahlili', price: 90_000, cat: 'Laboratoriya' },
            { name: 'Gormonlar kompleksi (estrogen, progesteron)', price: 200_000, cat: 'Laboratoriya' },
            { name: 'USG yonbosh a\'zolari', price: 120_000, cat: 'Ultratovush' },
            { name: 'USG ko\'krak bezi', price: 100_000, cat: 'Ultratovush' },
            { name: 'Ginekolog konsultatsiyasi', price: 130_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Homilador Ayollar Checkup',
        nameRu: 'Чекап для беременных',
        slug: 'homilador-ayollar-checkup',
        category: 'AGE_BASED',
        shortDescription: 'Homiladorlik davrida kompleks tekshiruv',
        targetAudience: 'Homilador ayollar',
        recommendedPrice: 1_050_000,
        priceMin: 945_000,
        priceMax: 1_205_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Qon guruhi va Rh faktor', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Qon ivish vaqti (koagulogramma)', price: 40_000, cat: 'Laboratoriya' },
            { name: 'USG homiladorlik (1-trihr)', price: 150_000, cat: 'Ultratovush' },
            { name: 'Gormonlar (HCG, progesteron)', price: 200_000, cat: 'Laboratoriya' },
            { name: 'TORCH infeksiyalar kompleksi', price: 200_000, cat: 'Laboratoriya' },
            { name: 'Qalqonsimon bez gormonlari', price: 120_000, cat: 'Laboratoriya' },
            { name: 'Glyukoza tolerantligi testi', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydikdagi oqsil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'VICh, Gepatit B/C, Sifilis', price: 120_000, cat: 'Laboratoriya' },
            { name: 'Ginekolog konsultatsiyasi', price: 130_000, cat: 'Konsultatsiya' },
            { name: 'Terapevt konsultatsiyasi', price: 100_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Bolalar 0-3 Yosh Checkup',
        nameRu: 'Чекап для детей 0-3 лет',
        slug: 'bolalar-0-3-checkup',
        category: 'AGE_BASED',
        shortDescription: 'Kichik yoshdagi bolalar uchun kompleks tekshiruv',
        targetAudience: '0-3 yoshdagi bolalar',
        recommendedPrice: 480_000,
        priceMin: 430_000,
        priceMax: 550_000,
        items: [
            { name: 'Qon klinik tahlili (bolalar)', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Neyrosonografiya (bosh miya USG)', price: 120_000, cat: 'Ultratovush' },
            { name: 'USG qorin bo\'shlig\'i', price: 120_000, cat: 'Ultratovush' },
            { name: 'Elektrolit tahlili (K, Na, Cl)', price: 40_000, cat: 'Laboratoriya' },
            { name: 'Pediatr konsultatsiyasi', price: 100_000, cat: 'Konsultatsiya' },
            { name: 'Nevrolog konsultatsiyasi', price: 120_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Bolalar 7-14 Yosh Checkup',
        nameRu: 'Чекап для детей 7-14 лет',
        slug: 'bolalar-7-14-checkup',
        category: 'AGE_BASED',
        shortDescription: 'Maktab yoshidagi bolalar uchun sog\'liq tekshiruvi',
        targetAudience: '7-14 yoshdagi maktab o\'quvchilari',
        recommendedPrice: 520_000,
        priceMin: 465_000,
        priceMax: 595_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'USG qorin bo\'shlig\'i', price: 120_000, cat: 'Ultratovush' },
            { name: 'Suyak yoshi rentgeni', price: 80_000, cat: 'Rentgen' },
            { name: 'O\'sish gormoni (STG)', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Pediatr konsultatsiyasi', price: 100_000, cat: 'Konsultatsiya' },
            { name: 'Endokrinolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Keksalar 65+ Checkup',
        nameRu: 'Чекап для пожилых 65+',
        slug: 'keksalar-65-checkup',
        category: 'AGE_BASED',
        shortDescription: 'Keksa yoshdagilar uchun keng qamrovli tekshiruv',
        targetAudience: '65+ yoshdagi kattalar',
        recommendedPrice: 1_150_000,
        priceMin: 1_035_000,
        priceMax: 1_320_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Qon glyukozasi', price: 20_000, cat: 'Laboratoriya' },
            { name: 'Lipidogramma', price: 70_000, cat: 'Laboratoriya' },
            { name: 'Koagulogramma', price: 60_000, cat: 'Laboratoriya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'EXO-KG (exokardiografiya)', price: 150_000, cat: 'Ultratovush' },
            { name: 'Ko\'krak qafasi rentgeni', price: 60_000, cat: 'Rentgen' },
            { name: 'Densitometriya (suyak zichligi)', price: 100_000, cat: 'Instrumental' },
            { name: 'PSA (prostata-spetsifik antigen)', price: 80_000, cat: 'Laboratoriya' },
            { name: 'USG qorin bo\'shlig\'i', price: 120_000, cat: 'Ultratovush' },
            { name: 'VICh, Gepatit B/C markerlari', price: 120_000, cat: 'Laboratoriya' },
            { name: 'Terapevt konsultatsiyasi', price: 100_000, cat: 'Konsultatsiya' },
            { name: 'Kardiolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Ishga Qabul Checkup',
        nameRu: 'Чекап при приёме на работу',
        slug: 'ishga-qabul-checkup',
        category: 'AGE_BASED',
        shortDescription: 'Ishga kirish uchun zaruriy tibbiy guvohnoma',
        targetAudience: 'Yangi ish boshlayotganlar',
        recommendedPrice: 380_000,
        priceMin: 340_000,
        priceMax: 435_000,
        items: [
            { name: 'Fluorografiya', price: 50_000, cat: 'Rentgen' },
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Qon guruhi va Rh faktor', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Gepatit B/C markerlari', price: 80_000, cat: 'Laboratoriya' },
            { name: 'Vizometriya (ko\'rish o\'tkirligi)', price: 30_000, cat: 'Oftalmologiya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'Terapevt konsultatsiyasi', price: 100_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Sportchilar Checkup',
        nameRu: 'Спортивный Чекап',
        slug: 'sportchilar-checkup',
        category: 'AGE_BASED',
        shortDescription: 'Professional sportchilar uchun chuqur tibbiy tekshiruv',
        targetAudience: 'Professional va amateur sportchilar',
        recommendedPrice: 890_000,
        priceMin: 800_000,
        priceMax: 1_020_000,
        items: [
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'Siydik umumiy tahlil', price: 30_000, cat: 'Laboratoriya' },
            { name: 'Biokimyoviy qon tahlili', price: 80_000, cat: 'Laboratoriya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'EXO-KG (exokardiografiya)', price: 150_000, cat: 'Ultratovush' },
            { name: 'Stress test (veloergometriya)', price: 150_000, cat: 'Instrumental' },
            { name: 'Spirometriya (FVD)', price: 80_000, cat: 'Instrumental' },
            { name: 'USG yurak va tomirlar', price: 150_000, cat: 'Ultratovush' },
            { name: 'Laktat tahlili (chidamlilik)', price: 60_000, cat: 'Laboratoriya' },
            { name: 'Ferritin va temir', price: 60_000, cat: 'Laboratoriya' },
            { name: 'Sport shifokori konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
            { name: 'Kardiolog konsultatsiyasi', price: 150_000, cat: 'Konsultatsiya' },
        ],
    });

    await createPackage(adminId, {
        nameUz: 'Haydovchilar Checkup',
        nameRu: 'Чекап для водителей',
        slug: 'haydovchilar-checkup',
        category: 'AGE_BASED',
        shortDescription: 'Haydovchilik guvohnomasi uchun tibbiy ko\'rik',
        targetAudience: 'Guvohnoma olish/yangilash',
        recommendedPrice: 420_000,
        priceMin: 375_000,
        priceMax: 480_000,
        items: [
            { name: 'Vizometriya (ko\'rish o\'tkirligi)', price: 30_000, cat: 'Oftalmologiya' },
            { name: 'Ko\'z tonometriyasi', price: 30_000, cat: 'Oftalmologiya' },
            { name: 'Eshituv o\'tkirligi tekshiruvi', price: 50_000, cat: 'Instrumental' },
            { name: 'Psixologik test (reaktsiya)', price: 60_000, cat: 'Psixologiya' },
            { name: 'Qon klinik tahlili', price: 50_000, cat: 'Laboratoriya' },
            { name: 'EKG (elektrokardiografiya)', price: 40_000, cat: 'Instrumental' },
            { name: 'Terapevt konsultatsiyasi', price: 100_000, cat: 'Konsultatsiya' },
            { name: 'Oftalmolog konsultatsiyasi', price: 130_000, cat: 'Konsultatsiya' },
        ],
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────────────────
    const total = await prisma.checkupPackage.count();
    const items = await prisma.checkupPackageItem.count();
    console.log(`\n✅ Tugadi! ${total} ta paket, ${items} ta xizmat yaratildi.`);
}

main()
    .catch(e => { console.error(e); throw e; })
    .finally(() => prisma.$disconnect());
