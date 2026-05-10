import { Loader2 } from 'lucide-react';
import TopBar from './TopBar';
import Navigation from './Navigation';
import HeroNew from './sections/HeroNew';
import PersonalizedBanner from './sections/PersonalizedBanner';
import CategoriesGrid from './sections/CategoriesGrid';
import HotDeals from './sections/HotDeals';
import TopClinics from './sections/TopClinics';
import PopularServices from './sections/PopularServices';
import StatsBanner from './sections/StatsBanner';
import HowItWorksNew from './sections/HowItWorks';
import RealReviews from './sections/RealReviews';
import CTABanner from './sections/CTABanner';
import FooterNew from './sections/FooterNew';
import { useHomeData } from '../../hooks/useHomeData';
import './css/base.css';
import './css/HomeNew.css';

export default function HomePage() {
    const { data, isLoading } = useHomeData();

    return (
        <div className="home-page home-new">
            <TopBar />
            <Navigation />

            <HeroNew stats={data?.stats} />

            <PersonalizedBanner />

            {isLoading ? (
                <div style={{ padding: '64px 0', textAlign: 'center', color: '#94a3b8' }}>
                    <Loader2 size={32} className="cdp-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: 12, fontSize: 14 }}>Yuklanmoqda...</p>
                </div>
            ) : (
                <>
                    <CategoriesGrid categories={data?.categories} />
                    <HotDeals deals={data?.hotDeals} />
                    <TopClinics clinics={data?.topClinics} />
                    <PopularServices services={data?.popularServices} />
                    <StatsBanner stats={data?.stats} />
                    <HowItWorksNew />
                    <RealReviews reviews={data?.reviews} />
                    <CTABanner />
                </>
            )}

            <FooterNew />
        </div>
    );
}
