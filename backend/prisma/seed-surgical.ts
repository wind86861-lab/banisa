import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!admin) { console.error('No admin found'); return; }

    // Clean old surgical data
    await prisma.surgicalService.deleteMany();
    const old = await prisma.serviceCategory.findFirst({ where: { slug: 'operations', level: 0 } });
    if (old) {
        const del = async (pid: string) => {
            const ch = await prisma.serviceCategory.findMany({ where: { parentId: pid } });
            for (const c of ch) await del(c.id);
            await prisma.serviceCategory.deleteMany({ where: { parentId: pid } });
        };
        await del(old.id);
        await prisma.serviceCategory.delete({ where: { id: old.id } });
    }

    // Root
    const root = await prisma.serviceCategory.create({ data: { nameUz: 'Operatsiyalar', nameRu: 'Операции', slug: 'operations', level: 0, icon: '📊', sortOrder: 1 } });

    // Level 1
    const eye    = await prisma.serviceCategory.create({ data: { nameUz: "Ko'z Xirurgiyasi",           slug: 'eye-surgery',     level: 1, parentId: root.id, icon: '👁️', sortOrder: 1 } });
    const gyn    = await prisma.serviceCategory.create({ data: { nameUz: 'Ginekologiya',               slug: 'gynecology',      level: 1, parentId: root.id, icon: '🤰', sortOrder: 2 } });
    const ortho  = await prisma.serviceCategory.create({ data: { nameUz: 'Travmatologiya-Ortopediya',  slug: 'orthopedics',     level: 1, parentId: root.id, icon: '🦴', sortOrder: 3 } });
    const repro  = await prisma.serviceCategory.create({ data: { nameUz: 'Reproduktiv Texnologiyalar', slug: 'repro-tech',      level: 1, parentId: root.id, icon: '👶', sortOrder: 4 } });
    const gen    = await prisma.serviceCategory.create({ data: { nameUz: 'Umumiy Xirurgiya',           slug: 'general-surgery', level: 1, parentId: root.id, icon: '🏥', sortOrder: 5 } });

    // Level 2 - Eye
    const catar  = await prisma.serviceCategory.create({ data: { nameUz: 'Katarakta',                    slug: 'cataract',      level: 2, parentId: eye.id,   icon: '•', sortOrder: 1 } });
    const refr   = await prisma.serviceCategory.create({ data: { nameUz: 'Refraktiv xirurgiya',           slug: 'refractive',    level: 2, parentId: eye.id,   icon: '•', sortOrder: 2 } });
    const glau   = await prisma.serviceCategory.create({ data: { nameUz: 'Glaukoma',                      slug: 'glaucoma',      level: 2, parentId: eye.id,   icon: '•', sortOrder: 3 } });
    const reti   = await prisma.serviceCategory.create({ data: { nameUz: 'Retinal xirurgiya',              slug: 'retinal',       level: 2, parentId: eye.id,   icon: '•', sortOrder: 4 } });
    const oeye   = await prisma.serviceCategory.create({ data: { nameUz: "Boshqa ko'z operatsiyalari",    slug: 'other-eye',     level: 2, parentId: eye.id,   icon: '•', sortOrder: 5 } });

    // Level 2 - Gyn
    const lapG   = await prisma.serviceCategory.create({ data: { nameUz: 'Laparoskopik operatsiyalar',    slug: 'lap-gyn',       level: 2, parentId: gyn.id,   icon: '•', sortOrder: 1 } });
    const hyst   = await prisma.serviceCategory.create({ data: { nameUz: 'Gisteroskopik operatsiyalar',   slug: 'hysteroscopic', level: 2, parentId: gyn.id,   icon: '•', sortOrder: 2 } });
    const rsurg  = await prisma.serviceCategory.create({ data: { nameUz: 'Reproduktiv xirurgiya',         slug: 'repro-surg',    level: 2, parentId: gyn.id,   icon: '•', sortOrder: 3 } });
    const oncg   = await prisma.serviceCategory.create({ data: { nameUz: 'Onkogynekologiya',              slug: 'onco-gyn',      level: 2, parentId: gyn.id,   icon: '•', sortOrder: 4 } });
    const obst   = await prisma.serviceCategory.create({ data: { nameUz: 'Obstetrik operatsiyalar',       slug: 'obstetric',     level: 2, parentId: gyn.id,   icon: '•', sortOrder: 5 } });

    // Level 2 - Ortho
    const knee   = await prisma.serviceCategory.create({ data: { nameUz: 'Tizza operatsiyalari',          slug: 'knee',          level: 2, parentId: ortho.id, icon: '•', sortOrder: 1 } });
    const shldr  = await prisma.serviceCategory.create({ data: { nameUz: 'Elka operatsiyalari',           slug: 'shoulder',      level: 2, parentId: ortho.id, icon: '•', sortOrder: 2 } });
    const spine  = await prisma.serviceCategory.create({ data: { nameUz: 'Umurtqa operatsiyalari',        slug: 'spine',         level: 2, parentId: ortho.id, icon: '•', sortOrder: 3 } });
    const joint  = await prisma.serviceCategory.create({ data: { nameUz: "Bo'g'im protezlash",            slug: 'joint-replace', level: 2, parentId: ortho.id, icon: '•', sortOrder: 4 } });
    const hand   = await prisma.serviceCategory.create({ data: { nameUz: "Qo'l xirurgiyasi",              slug: 'hand-surg',     level: 2, parentId: ortho.id, icon: '•', sortOrder: 5 } });
    const frac   = await prisma.serviceCategory.create({ data: { nameUz: 'Siniq davolash',                slug: 'fracture',      level: 2, parentId: ortho.id, icon: '•', sortOrder: 6 } });

    // Level 2 - Repro
    const ivf    = await prisma.serviceCategory.create({ data: { nameUz: 'IVF jarayonlari',               slug: 'ivf',           level: 2, parentId: repro.id, icon: '•', sortOrder: 1 } });
    const embr   = await prisma.serviceCategory.create({ data: { nameUz: 'Embrion proceduralar',          slug: 'embryo',        level: 2, parentId: repro.id, icon: '•', sortOrder: 2 } });
    const donr   = await prisma.serviceCategory.create({ data: { nameUz: 'Donor dasturlari',              slug: 'donor',         level: 2, parentId: repro.id, icon: '•', sortOrder: 3 } });
    const addR   = await prisma.serviceCategory.create({ data: { nameUz: "Qo'shimcha protseduralar",      slug: 'add-repro',     level: 2, parentId: repro.id, icon: '•', sortOrder: 4 } });

    // Level 2 - General
    const abd    = await prisma.serviceCategory.create({ data: { nameUz: 'Qorin xirurgiyasi',             slug: 'abdominal',     level: 2, parentId: gen.id,   icon: '•', sortOrder: 1 } });
    const lapGn  = await prisma.serviceCategory.create({ data: { nameUz: 'Laparoskopik operatsiyalar',    slug: 'lap-gen',       level: 2, parentId: gen.id,   icon: '•', sortOrder: 2 } });
    const brs    = await prisma.serviceCategory.create({ data: { nameUz: "Ko'krak xirurgiyasi",           slug: 'breast',        level: 2, parentId: gen.id,   icon: '•', sortOrder: 3 } });
    const thyr   = await prisma.serviceCategory.create({ data: { nameUz: 'Qalqonsimon bez',              slug: 'thyroid',       level: 2, parentId: gen.id,   icon: '•', sortOrder: 4 } });
    const clr    = await prisma.serviceCategory.create({ data: { nameUz: 'Gemorroi va kolorektal',       slug: 'colorectal',    level: 2, parentId: gen.id,   icon: '•', sortOrder: 5 } });
    const vasc   = await prisma.serviceCategory.create({ data: { nameUz: "Qon tomirlari xirurgiyasi",    slug: 'vascular',      level: 2, parentId: gen.id,   icon: '•', sortOrder: 6 } });

    console.log('✓ Categories done');

    type S = { c:string; n:string; cx:string; r:string; p:number; mn:number; mx:number; a:string; rec:number; hosp:number };
    const svcs: S[] = [
        // Eye - Cataract
        { c:catar.id, n:'Standart katarakta operatsiyasi',          cx:'MEDIUM',   r:'LOW',    p:3000000,  mn:2500000,  mx:4000000,  a:'LOCAL',   rec:7,   hosp:0 },
        { c:catar.id, n:'Premium katarakta (Trifocal linza)',       cx:'COMPLEX',  r:'LOW',    p:8000000,  mn:7000000,  mx:10000000, a:'LOCAL',   rec:7,   hosp:0 },
        { c:catar.id, n:'Murakkab katarakta',                       cx:'COMPLEX',  r:'MEDIUM', p:5000000,  mn:4000000,  mx:7000000,  a:'LOCAL',   rec:14,  hosp:1 },
        // Eye - Refractive
        { c:refr.id,  n:'LASIK',                                    cx:'MEDIUM',   r:'LOW',    p:6000000,  mn:5000000,  mx:8000000,  a:'LOCAL',   rec:3,   hosp:0 },
        { c:refr.id,  n:'PRK (Photorefractive Keratectomy)',        cx:'MEDIUM',   r:'LOW',    p:5000000,  mn:4000000,  mx:7000000,  a:'LOCAL',   rec:7,   hosp:0 },
        { c:refr.id,  n:'SMILE',                                    cx:'COMPLEX',  r:'LOW',    p:8000000,  mn:7000000,  mx:10000000, a:'LOCAL',   rec:2,   hosp:0 },
        { c:refr.id,  n:'ICL (Implantable Contact Lens)',           cx:'COMPLEX',  r:'MEDIUM', p:12000000, mn:10000000, mx:15000000, a:'LOCAL',   rec:7,   hosp:0 },
        // Eye - Glaucoma
        { c:glau.id,  n:'Trabekulektomiya',                         cx:'COMPLEX',  r:'MEDIUM', p:4000000,  mn:3500000,  mx:5500000,  a:'LOCAL',   rec:14,  hosp:1 },
        { c:glau.id,  n:'Shunt implantatsiya',                      cx:'COMPLEX',  r:'MEDIUM', p:6000000,  mn:5000000,  mx:8000000,  a:'GENERAL', rec:21,  hosp:2 },
        { c:glau.id,  n:'Lazer trabekuloplastika',                  cx:'SIMPLE',   r:'LOW',    p:2000000,  mn:1500000,  mx:3000000,  a:'LOCAL',   rec:1,   hosp:0 },
        // Eye - Retinal
        { c:reti.id,  n:'Vitrektomiya',                             cx:'ADVANCED', r:'HIGH',   p:8000000,  mn:7000000,  mx:12000000, a:'GENERAL', rec:30,  hosp:3 },
        { c:reti.id,  n:'Retinal detachment repair',                cx:'ADVANCED', r:'HIGH',   p:10000000, mn:8000000,  mx:15000000, a:'GENERAL', rec:45,  hosp:5 },
        { c:reti.id,  n:'Makulyar teshik operatsiyasi',             cx:'ADVANCED', r:'HIGH',   p:9000000,  mn:7500000,  mx:13000000, a:'GENERAL', rec:30,  hosp:3 },
        { c:reti.id,  n:'Diabetik retinopatiya',                    cx:'COMPLEX',  r:'MEDIUM', p:7000000,  mn:6000000,  mx:10000000, a:'LOCAL',   rec:21,  hosp:2 },
        // Eye - Other
        { c:oeye.id,  n:'Pterygium olib tashlash',                  cx:'SIMPLE',   r:'LOW',    p:1500000,  mn:1000000,  mx:2500000,  a:'LOCAL',   rec:7,   hosp:0 },
        { c:oeye.id,  n:'Strabismus tuzatish',                      cx:'MEDIUM',   r:'MEDIUM', p:3500000,  mn:3000000,  mx:5000000,  a:'GENERAL', rec:14,  hosp:1 },
        { c:oeye.id,  n:'Oculoplastic surgery',                     cx:'COMPLEX',  r:'MEDIUM', p:5000000,  mn:4000000,  mx:7000000,  a:'GENERAL', rec:21,  hosp:2 },
        // Gyn - Laparoscopic
        { c:lapG.id,  n:'Laparoskopik kist olib tashlash',          cx:'MEDIUM',   r:'MEDIUM', p:5000000,  mn:4000000,  mx:7000000,  a:'GENERAL', rec:7,   hosp:1 },
        { c:lapG.id,  n:'Laparoskopik mioma olib tashlash',         cx:'COMPLEX',  r:'MEDIUM', p:8000000,  mn:7000000,  mx:12000000, a:'GENERAL', rec:14,  hosp:2 },
        { c:lapG.id,  n:'Laparoskopik endometrioz davolash',        cx:'COMPLEX',  r:'MEDIUM', p:7000000,  mn:6000000,  mx:10000000, a:'GENERAL', rec:14,  hosp:2 },
        { c:lapG.id,  n:'Laparoskopik gisterektomiya',              cx:'ADVANCED', r:'HIGH',   p:12000000, mn:10000000, mx:18000000, a:'GENERAL', rec:21,  hosp:3 },
        // Gyn - Hysteroscopic
        { c:hyst.id,  n:'Gisteroskopik polip olib tashlash',        cx:'SIMPLE',   r:'LOW',    p:2500000,  mn:2000000,  mx:4000000,  a:'GENERAL', rec:3,   hosp:0 },
        { c:hyst.id,  n:'Gisteroskopik myomectomy',                 cx:'MEDIUM',   r:'MEDIUM', p:5000000,  mn:4000000,  mx:7000000,  a:'GENERAL', rec:7,   hosp:1 },
        { c:hyst.id,  n:'Gisteroskopik septum resection',           cx:'MEDIUM',   r:'MEDIUM', p:4500000,  mn:3500000,  mx:6500000,  a:'GENERAL', rec:7,   hosp:1 },
        // Gyn - Repro Surgery
        { c:rsurg.id, n:'Tubal ligation reversal',                  cx:'COMPLEX',  r:'MEDIUM', p:8000000,  mn:7000000,  mx:12000000, a:'GENERAL', rec:21,  hosp:2 },
        { c:rsurg.id, n:'Ovarian drilling',                         cx:'MEDIUM',   r:'MEDIUM', p:4000000,  mn:3000000,  mx:6000000,  a:'GENERAL', rec:7,   hosp:1 },
        { c:rsurg.id, n:'Salpingectomy',                            cx:'MEDIUM',   r:'MEDIUM', p:5000000,  mn:4000000,  mx:7500000,  a:'GENERAL', rec:14,  hosp:2 },
        // Gyn - Onco
        { c:oncg.id,  n:'Bachadon operatsiyasi (Hysterectomy)',     cx:'COMPLEX',  r:'HIGH',   p:15000000, mn:12000000, mx:22000000, a:'GENERAL', rec:42,  hosp:5 },
        { c:oncg.id,  n:'Tuxumdon operatsiyasi (Oophorectomy)',     cx:'COMPLEX',  r:'HIGH',   p:12000000, mn:10000000, mx:18000000, a:'GENERAL', rec:30,  hosp:4 },
        { c:oncg.id,  n:'Lymph node dissection',                    cx:'ADVANCED', r:'HIGH',   p:18000000, mn:15000000, mx:25000000, a:'GENERAL', rec:42,  hosp:5 },
        // Gyn - Obstetric
        { c:obst.id,  n:'Kesariya kesma (C-section)',               cx:'MEDIUM',   r:'MEDIUM', p:8000000,  mn:6000000,  mx:12000000, a:'SPINAL',  rec:42,  hosp:5 },
        { c:obst.id,  n:'Emergency C-section',                      cx:'COMPLEX',  r:'HIGH',   p:12000000, mn:10000000, mx:18000000, a:'GENERAL', rec:42,  hosp:5 },
        { c:obst.id,  n:'VBAC support surgery',                     cx:'COMPLEX',  r:'HIGH',   p:10000000, mn:8000000,  mx:15000000, a:'SPINAL',  rec:42,  hosp:5 },
        // Ortho - Knee
        { c:knee.id,  n:'ACL reconstruction',                       cx:'COMPLEX',  r:'MEDIUM', p:15000000, mn:12000000, mx:20000000, a:'SPINAL',  rec:180, hosp:2 },
        { c:knee.id,  n:'Meniscus repair',                          cx:'MEDIUM',   r:'MEDIUM', p:8000000,  mn:6000000,  mx:12000000, a:'SPINAL',  rec:90,  hosp:1 },
        { c:knee.id,  n:'Tizza protezlash (Total knee replacement)',cx:'ADVANCED', r:'HIGH',   p:35000000, mn:30000000, mx:50000000, a:'SPINAL',  rec:180, hosp:7 },
        { c:knee.id,  n:'Artroskopik debridement',                  cx:'MEDIUM',   r:'LOW',    p:6000000,  mn:5000000,  mx:9000000,  a:'SPINAL',  rec:30,  hosp:1 },
        // Ortho - Shoulder
        { c:shldr.id, n:'Rotator cuff repair',                      cx:'COMPLEX',  r:'MEDIUM', p:12000000, mn:10000000, mx:18000000, a:'GENERAL', rec:180, hosp:2 },
        { c:shldr.id, n:'Elka protezlash',                          cx:'ADVANCED', r:'HIGH',   p:30000000, mn:25000000, mx:45000000, a:'GENERAL', rec:180, hosp:5 },
        { c:shldr.id, n:'Bankart repair',                           cx:'COMPLEX',  r:'MEDIUM', p:10000000, mn:8000000,  mx:15000000, a:'GENERAL', rec:90,  hosp:2 },
        { c:shldr.id, n:'Acromioplasty',                            cx:'MEDIUM',   r:'MEDIUM', p:8000000,  mn:6000000,  mx:12000000, a:'GENERAL', rec:60,  hosp:1 },
        // Ortho - Spine
        { c:spine.id, n:'Disk herniya operatsiyasi (Microdiscectomy)', cx:'COMPLEX', r:'HIGH',  p:18000000, mn:15000000, mx:25000000, a:'GENERAL', rec:42, hosp:3 },
        { c:spine.id, n:'Spinal fusion',                            cx:'ADVANCED', r:'HIGH',   p:35000000, mn:28000000, mx:50000000, a:'GENERAL', rec:180, hosp:7 },
        { c:spine.id, n:'Laminektomiya',                            cx:'COMPLEX',  r:'HIGH',   p:20000000, mn:16000000, mx:28000000, a:'GENERAL', rec:90,  hosp:5 },
        { c:spine.id, n:'Vertebroplasty',                           cx:'MEDIUM',   r:'MEDIUM', p:12000000, mn:10000000, mx:18000000, a:'LOCAL',   rec:14,  hosp:2 },
        // Ortho - Joint
        { c:joint.id, n:"Son bo'g'imi protezlash (Hip replacement)",cx:'ADVANCED', r:'HIGH',   p:40000000, mn:32000000, mx:60000000, a:'SPINAL',  rec:180, hosp:7 },
        { c:joint.id, n:'Tizza protezlash',                         cx:'ADVANCED', r:'HIGH',   p:35000000, mn:30000000, mx:50000000, a:'SPINAL',  rec:180, hosp:7 },
        { c:joint.id, n:'Elka protezlash',                          cx:'ADVANCED', r:'HIGH',   p:30000000, mn:25000000, mx:45000000, a:'GENERAL', rec:180, hosp:5 },
        { c:joint.id, n:'Tovon protezlash',                         cx:'ADVANCED', r:'HIGH',   p:28000000, mn:22000000, mx:40000000, a:'SPINAL',  rec:180, hosp:5 },
        // Ortho - Hand
        { c:hand.id,  n:'Carpal tunnel release',                    cx:'SIMPLE',   r:'LOW',    p:3000000,  mn:2500000,  mx:5000000,  a:'LOCAL',   rec:21,  hosp:0 },
        { c:hand.id,  n:'Trigger finger release',                   cx:'SIMPLE',   r:'LOW',    p:2000000,  mn:1500000,  mx:3500000,  a:'LOCAL',   rec:14,  hosp:0 },
        { c:hand.id,  n:'Dupuytren contracture',                    cx:'MEDIUM',   r:'MEDIUM', p:5000000,  mn:4000000,  mx:8000000,  a:'GENERAL', rec:42,  hosp:1 },
        { c:hand.id,  n:'Tendon repair',                            cx:'MEDIUM',   r:'MEDIUM', p:6000000,  mn:5000000,  mx:9000000,  a:'GENERAL', rec:60,  hosp:1 },
        // Ortho - Fracture
        { c:frac.id,  n:'ORIF (Open reduction internal fixation)',  cx:'COMPLEX',  r:'MEDIUM', p:10000000, mn:8000000,  mx:15000000, a:'GENERAL', rec:90,  hosp:3 },
        { c:frac.id,  n:'External fixation',                        cx:'MEDIUM',   r:'MEDIUM', p:6000000,  mn:5000000,  mx:9000000,  a:'GENERAL', rec:60,  hosp:2 },
        { c:frac.id,  n:'Intramedullary nailing',                   cx:'COMPLEX',  r:'MEDIUM', p:8000000,  mn:6000000,  mx:12000000, a:'GENERAL', rec:90,  hosp:3 },
        // Repro - IVF
        { c:ivf.id,   n:'IVF (In-vitro fertilization)',             cx:'MEDIUM',   r:'LOW',    p:15000000, mn:12000000, mx:20000000, a:'LOCAL',   rec:1,   hosp:0 },
        { c:ivf.id,   n:'ICSI (Intracytoplasmic sperm injection)',  cx:'MEDIUM',   r:'LOW',    p:18000000, mn:15000000, mx:25000000, a:'LOCAL',   rec:1,   hosp:0 },
        { c:ivf.id,   n:'IMSI (Intracytoplasmic morphologically selected sperm injection)', cx:'COMPLEX', r:'LOW', p:22000000, mn:18000000, mx:30000000, a:'LOCAL', rec:1, hosp:0 },
        { c:ivf.id,   n:'PGT (Preimplantation genetic testing)',    cx:'COMPLEX',  r:'LOW',    p:25000000, mn:20000000, mx:35000000, a:'LOCAL',   rec:1,   hosp:0 },
        // Repro - Embryo
        { c:embr.id,  n:'Embrion muzlatish',                        cx:'SIMPLE',   r:'LOW',    p:5000000,  mn:4000000,  mx:8000000,  a:'LOCAL',   rec:0,   hosp:0 },
        { c:embr.id,  n:'Embrion transfer',                         cx:'SIMPLE',   r:'LOW',    p:4000000,  mn:3000000,  mx:6000000,  a:'LOCAL',   rec:1,   hosp:0 },
        { c:embr.id,  n:'Assisted hatching',                        cx:'MEDIUM',   r:'LOW',    p:3000000,  mn:2000000,  mx:5000000,  a:'LOCAL',   rec:1,   hosp:0 },
        { c:embr.id,  n:'Blastocyst culture',                       cx:'MEDIUM',   r:'LOW',    p:6000000,  mn:5000000,  mx:9000000,  a:'LOCAL',   rec:1,   hosp:0 },
        // Repro - Donor
        { c:donr.id,  n:'Donor tuxumdon',                           cx:'COMPLEX',  r:'MEDIUM', p:30000000, mn:25000000, mx:40000000, a:'LOCAL',   rec:7,   hosp:0 },
        { c:donr.id,  n:'Donor sperma',                             cx:'SIMPLE',   r:'LOW',    p:5000000,  mn:4000000,  mx:8000000,  a:'LOCAL',   rec:0,   hosp:0 },
        { c:donr.id,  n:'Donor embrion',                            cx:'COMPLEX',  r:'MEDIUM', p:20000000, mn:15000000, mx:30000000, a:'LOCAL',   rec:1,   hosp:0 },
        // Repro - Additional
        { c:addR.id,  n:'Tuxumdon stimulyatsiya',                   cx:'SIMPLE',   r:'LOW',    p:3000000,  mn:2000000,  mx:5000000,  a:'LOCAL',   rec:0,   hosp:0 },
        { c:addR.id,  n:'Oocyte retrieval',                         cx:'MEDIUM',   r:'LOW',    p:5000000,  mn:4000000,  mx:8000000,  a:'LOCAL',   rec:1,   hosp:0 },
        { c:addR.id,  n:"Sperma yo'llari biopsy",                   cx:'MEDIUM',   r:'MEDIUM', p:4000000,  mn:3000000,  mx:6000000,  a:'LOCAL',   rec:3,   hosp:0 },
        { c:addR.id,  n:'Surrogacy support',                        cx:'COMPLEX',  r:'MEDIUM', p:15000000, mn:12000000, mx:22000000, a:'LOCAL',   rec:1,   hosp:0 },
        // General - Abdominal
        { c:abd.id,   n:'Appendektomiya',                           cx:'MEDIUM',   r:'MEDIUM', p:4000000,  mn:3000000,  mx:6000000,  a:'GENERAL', rec:14,  hosp:2 },
        { c:abd.id,   n:"Cholecystectomy (O't pufagi)",             cx:'MEDIUM',   r:'MEDIUM', p:6000000,  mn:5000000,  mx:9000000,  a:'GENERAL', rec:14,  hosp:2 },
        { c:abd.id,   n:'Herniya tuzatish',                         cx:'MEDIUM',   r:'MEDIUM', p:5000000,  mn:4000000,  mx:8000000,  a:'SPINAL',  rec:21,  hosp:1 },
        { c:abd.id,   n:'Oshqozon operatsiyasi',                    cx:'COMPLEX',  r:'HIGH',   p:18000000, mn:15000000, mx:25000000, a:'GENERAL', rec:42,  hosp:7 },
        { c:abd.id,   n:'Ichak operatsiyasi',                       cx:'COMPLEX',  r:'HIGH',   p:20000000, mn:16000000, mx:30000000, a:'GENERAL', rec:42,  hosp:7 },
        // General - Laparoscopic
        { c:lapGn.id, n:'Laparoskopik cholecystectomy',             cx:'MEDIUM',   r:'MEDIUM', p:5000000,  mn:4000000,  mx:8000000,  a:'GENERAL', rec:7,   hosp:1 },
        { c:lapGn.id, n:'Laparoskopik appendektomiya',              cx:'MEDIUM',   r:'MEDIUM', p:4000000,  mn:3000000,  mx:7000000,  a:'GENERAL', rec:7,   hosp:1 },
        { c:lapGn.id, n:'Laparoskopik herniya',                     cx:'MEDIUM',   r:'MEDIUM', p:5000000,  mn:4000000,  mx:8000000,  a:'GENERAL', rec:14,  hosp:1 },
        { c:lapGn.id, n:'Laparoskopik fundoplastika',               cx:'COMPLEX',  r:'MEDIUM', p:10000000, mn:8000000,  mx:15000000, a:'GENERAL', rec:21,  hosp:3 },
        // General - Breast
        { c:brs.id,   n:'Mastektomiya',                             cx:'COMPLEX',  r:'HIGH',   p:20000000, mn:16000000, mx:28000000, a:'GENERAL', rec:42,  hosp:5 },
        { c:brs.id,   n:'Lumpectomy',                               cx:'MEDIUM',   r:'MEDIUM', p:8000000,  mn:6000000,  mx:12000000, a:'GENERAL', rec:21,  hosp:2 },
        { c:brs.id,   n:'Biopsy',                                   cx:'SIMPLE',   r:'LOW',    p:2000000,  mn:1500000,  mx:3500000,  a:'LOCAL',   rec:3,   hosp:0 },
        { c:brs.id,   n:'Rekonstruktiv operatsiya',                 cx:'ADVANCED', r:'HIGH',   p:35000000, mn:28000000, mx:50000000, a:'GENERAL', rec:90,  hosp:7 },
        // General - Thyroid
        { c:thyr.id,  n:"Thyroidectomy (to'liq)",                   cx:'COMPLEX',  r:'MEDIUM', p:10000000, mn:8000000,  mx:15000000, a:'GENERAL', rec:21,  hosp:3 },
        { c:thyr.id,  n:'Partial thyroidectomy',                    cx:'MEDIUM',   r:'MEDIUM', p:7000000,  mn:6000000,  mx:10000000, a:'GENERAL', rec:14,  hosp:2 },
        { c:thyr.id,  n:'Parathyroidectomy',                        cx:'COMPLEX',  r:'MEDIUM', p:9000000,  mn:7000000,  mx:13000000, a:'GENERAL', rec:14,  hosp:2 },
        // General - Colorectal
        { c:clr.id,   n:'Gemorroi operatsiyasi',                    cx:'SIMPLE',   r:'LOW',    p:3000000,  mn:2000000,  mx:5000000,  a:'SPINAL',  rec:14,  hosp:1 },
        { c:clr.id,   n:'Fistula repair',                           cx:'MEDIUM',   r:'MEDIUM', p:5000000,  mn:4000000,  mx:8000000,  a:'SPINAL',  rec:21,  hosp:2 },
        { c:clr.id,   n:'Anal fissure surgery',                     cx:'SIMPLE',   r:'LOW',    p:3000000,  mn:2500000,  mx:5000000,  a:'SPINAL',  rec:14,  hosp:1 },
        { c:clr.id,   n:'Kolorektal rezektsiya',                    cx:'ADVANCED', r:'HIGH',   p:25000000, mn:20000000, mx:35000000, a:'GENERAL', rec:90,  hosp:7 },
        // General - Vascular
        { c:vasc.id,  n:'Varikoz operatsiyasi',                     cx:'MEDIUM',   r:'MEDIUM', p:6000000,  mn:5000000,  mx:9000000,  a:'SPINAL',  rec:21,  hosp:1 },
        { c:vasc.id,  n:'AV fistula yaratish',                      cx:'MEDIUM',   r:'MEDIUM', p:8000000,  mn:6000000,  mx:12000000, a:'LOCAL',   rec:21,  hosp:2 },
        { c:vasc.id,  n:'Aneurysm repair',                          cx:'ADVANCED', r:'HIGH',   p:40000000, mn:32000000, mx:55000000, a:'GENERAL', rec:180, hosp:10 },
        { c:vasc.id,  n:'Bypass surgery',                           cx:'ADVANCED', r:'HIGH',   p:45000000, mn:35000000, mx:65000000, a:'GENERAL', rec:180, hosp:10 },
    ];

    for (const s of svcs) {
        await prisma.surgicalService.create({
            data: {
                nameUz: s.n,
                categoryId: s.c,
                complexity: s.cx as any,
                riskLevel: s.r as any,
                priceRecommended: s.p,
                priceMin: s.mn,
                priceMax: s.mx,
                anesthesiaType: s.a as any,
                recoveryDays: s.rec,
                hospitalizationDays: s.hosp,
                isActive: true,
                createdById: admin.id,
            }
        });
        console.log(`  ✓ ${s.n}`);
    }

    console.log(`\n✅ Done: ${svcs.length} operations, 31 categories`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
