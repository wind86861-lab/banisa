import TopBar from './TopBar';
import Navigation from './Navigation';
import Hero from './Hero';
import Services from './Services';
import Stats from './Stats';
import AppointmentCTA from './AppointmentCTA';
import WhyChooseUs from './WhyChooseUs';
import Doctors from './Doctors';
import Testimonials from './Testimonials';
import HowItWorks from './HowItWorks';
import DoctorProfile from './DoctorProfile';
import FAQ from './FAQ';
import Awards from './Awards';
import Blog from './Blog';
import MapContact from './MapContact';
import Footer from './Footer';
import './css/base.css';

export default function HomePage() {
    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <Hero />
            <Services />
            <Stats />
            <AppointmentCTA />
            <WhyChooseUs />
            <Doctors />
            <Testimonials />
            <HowItWorks />
            <DoctorProfile />
            <FAQ />
            <Awards />
            <Blog />
            <MapContact />
            <Footer />
        </div>
    );
}
