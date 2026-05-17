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
import BanisaLoader from '../../shared/components/BanisaLoader';
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
                <BanisaLoader message="Yuklanmoqda" />
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
