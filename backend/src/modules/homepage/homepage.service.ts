import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SECTIONS = ['topbar', 'navigation', 'hero', 'services', 'stats', 'why_choose_us', 'doctors', 'testimonials', 'how_it_works', 'faq', 'awards', 'blog', 'footer', 'legal_docs'];

const DEFAULTS: Record<string, object> = {
    navigation: {
        siteName: 'BANISA',
        siteTagline: 'Hospital Booking System',
        logoColor: '#1dbfc1',
        logoUrl: '',
    },
    services: {
        badge: 'Our Services',
        title: 'Start Feeling Your Best',
        subtitle: 'Explore Our Wellness Services',
    },
    topbar: {
        phone: '+998 71 123 45 67',
        email: 'info@banisa.uz',
        appointmentLabel: 'Onlayn Navbat',
        appointmentValue: 'Hozir Oling',
        workingHours: 'Dush–Juma: 09:00–18:00',
    },
    hero: {
        badge: '24/7 EMERGENCY SERVICE',
        title1: 'Medical &',
        title2: 'Health Care',
        titleHighlight: 'Services',
        description: 'Your health is our top priority. Schedule an appointment with us today',
        bgImage: '',
        chatAvatar: '/images/1752040923.avatar6.webp',
        chatTitle: 'Have a Question?',
        chatEmail: 'info@banisa.uz',
    },
    stats: {
        avatars: [
            '/images/1751463932_img2.png',
            '/images/1751463870_img1.png',
            '/images/1751463965_img3.png',
            '/images/1751463996_img4.png',
        ],
        bookingText: '300+ Appointment Booking Confirm for this Week',
        specialists: '200',
        patients: '45k',
        awards: '150',
        bgImage: '',
    },
    why_choose_us: {
        badge: 'Why Us',
        title: 'Why Choose Us for Your Healthcare Needs',
        image: '/images/1752043088.img5.webp',
        bgImage: '/images/1752043088.bg1.webp',
        yearsExperienced: '20',
        reasons: [
            { title: 'More Experience', desc: 'We offer a wide range of health services to meet all your needs.' },
            { title: 'Seamless Care', desc: 'We offer a wide range of health services to meet all your needs.' },
            { title: 'The Right Answers', desc: 'We offer a wide range of health services to meet all your needs.' },
            { title: 'Unparalleled Expertise', desc: 'We offer a wide range of health services to meet all your needs.' },
        ],
    },
    doctors: {
        badge: 'Our Team',
        title: 'Meet Our Expert Doctors',
        doctors: [
            { name: 'Danial Frankie', specialty: 'Cardiac Surgery', img: '/images/1751463932_img2.png' },
            { name: 'Kenneth Fong', specialty: 'Occupational Therapy', img: '/images/1751463996_img4.png' },
            { name: 'Nashid Martines', specialty: 'Pediatric Clinic', img: '/images/1751463870_img1.png' },
            { name: 'Rihana Roy', specialty: 'Gynecology', img: '/images/1751463965_img3.png' },
        ],
    },
    testimonials: {
        badge: 'Testimonials',
        title: 'What Our Patients Say',
        image: '/images/1752042615.img1.webp',
        reviews: [
            { name: 'Sarah Johnson', role: 'Patient', rating: 5, comment: 'Excellent service and professional staff. Highly recommend BANISA for all healthcare needs.', img: '/images/1752123738_img1.png' },
            { name: 'Mike Davis', role: 'Patient', rating: 5, comment: 'Outstanding medical care. The doctors are knowledgeable and caring.', img: '/images/1752123672_img2.png' },
            { name: 'Emily Chen', role: 'Patient', rating: 5, comment: 'Best hospital experience I have had. Clean, professional, and efficient.', img: '/images/1752124093_img3.png' },
            { name: 'James Wilson', role: 'Patient', rating: 5, comment: 'World-class facilities and amazing doctors. Will definitely return.', img: '/images/1752124220_img4.png' },
        ],
    },
    how_it_works: {
        badge: 'Process',
        title: 'How It Works',
        description: 'Getting quality healthcare at BANISA is simple. Follow these easy steps to book your appointment and receive world-class treatment.',
        image: '/images/1752043509.img4.webp',
        specialists: '180',
        patients: '45k',
        steps: [
            { title: 'Book an Appointment' },
            { title: 'Conduct Checkup' },
            { title: 'Perform Treatment' },
            { title: 'Prescribe & Payment' },
        ],
    },
    faq: {
        badge: 'FAQ',
        title: 'Frequently Asked Questions',
        description: 'Have questions about our services or how to book an appointment? We have answered the most common questions below to help you get started.',
        image: '/images/1752043777.img3.webp',
        bgImage: '',
        phone: '+998 71 123 45 67',
        faqs: [
            { q: 'How do I book an appointment at BANISA?', a: 'You can book an appointment by calling our helpline, sending an email, or using the online appointment form on our website.' },
            { q: 'What medical specialties do your doctors cover?', a: 'BANISA offers a wide range of specialties including Cardiology, Dermatology, Neurology, Pediatrics, and more.' },
            { q: 'What types of treatments and procedures do you offer?', a: 'We provide both outpatient and inpatient services including diagnostics, surgical procedures, and rehabilitation.' },
            { q: 'Can I cancel or reschedule my appointment?', a: 'Yes. You can cancel or reschedule your appointment up to 2 hours before the scheduled time.' },
        ],
    },
    awards: {
        badge: 'Recognition',
        title: 'Our Awards & Achievements',
        description: 'We are proud to be recognized for excellence in healthcare, patient safety, and medical innovation across Uzbekistan.',
        awards: [
            { img: '/images/kfoAYees6j5aQbo3KvdJP8zFDp32ELMZ19A3kEGo.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
            { img: '/images/TXJ979qiSF3jKIfe8KMmhGDJQLDDKZYXjBeSdTsK.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
            { img: '/images/mbQ5U3Ylk0OPBxhJh1P0XDEGqIoitTSGlBVQu1Nt.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
            { img: '/images/Qg7HHkIkj3g3BtibwevUxTVicVjeJF1Pq0VvSqZR.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
            { img: '/images/W9jhEHAGM2wBpaWvYKP2cB2UpTjDuLJQNvBkElx0.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
            { img: '/images/wg1OkuMz1bJZQZDb06I6QCVJKqdG46Fspwax31YH.png', title: 'ClinicMaster 2024', org: 'Quality and Accreditation Institute', label: 'Save the Children' },
        ],
    },
    blog: {
        badge: 'Health Blog',
        title: 'Latest Health News & Articles',
        posts: [
            { title: 'Understanding Heart Disease: Prevention & Care', category: 'Cardiology', date: 'March 15, 2024', img: '/images/1752040923.img1.webp', excerpt: 'Learn about the latest advances in cardiovascular care and how to keep your heart healthy.' },
            { title: 'The Importance of Regular Health Checkups', category: 'Preventive Care', date: 'March 10, 2024', img: '/images/1752042615.img1.webp', excerpt: 'Regular checkups can detect problems before they start and help find issues early.' },
            { title: 'Mental Health Awareness in Modern Medicine', category: 'Mental Health', date: 'March 5, 2024', img: '/images/1752042615.img2.webp', excerpt: 'Mental health is just as important as physical health. Here is what you need to know.' },
        ],
    },
    legal_docs: {
        termsUrl: '',
        privacyUrl: '',
        ofertaUrl: '',
    },
    footer: {
        description: 'BANISA — zamonaviy tibbiyot markazi. Biz sizning sog\'lig\'ingizni birinchi o\'ringa qo\'yamiz.',
        tagline: 'Kasalxonaga onlayn bron qilish tizimi — Tez, qulay va xavfsiz',
        phone: '+998 71 123 45 67',
        email: 'info@banisa.uz',
        workingHours: 'Dush–Juma: 09:00–18:00',
        logo: '/images/1752849488.logo-white.svg',
        mapLat: '41.2995',
        mapLng: '69.2401',
        address: 'Toshkent, O\'zbekiston',
    },
};

export const getAllSections = async () => {
    const rows = await prisma.homepageSettings.findMany();
    const result: Record<string, object> = { ...DEFAULTS };
    for (const row of rows) {
        result[row.section] = row.content as object;
    }
    return result;
};

export const getSection = async (section: string) => {
    const row = await prisma.homepageSettings.findUnique({ where: { section } });
    return row ? row.content : DEFAULTS[section] ?? {};
};

export const upsertSection = async (section: string, content: object) => {
    if (!SECTIONS.includes(section)) throw new Error(`Unknown section: ${section}`);
    return prisma.homepageSettings.upsert({
        where: { section },
        update: { content },
        create: { section, content },
    });
};
