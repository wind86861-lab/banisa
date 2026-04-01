import TopBar from './TopBar';
import Navigation from './Navigation';
import Hero from './Hero';
import Services from './Services';
import Stats from './Stats';
import WhyChooseUs from './WhyChooseUs';
import Doctors from './Doctors';
import Testimonials from './Testimonials';
import HowItWorks from './HowItWorks';
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
            <WhyChooseUs />
            <Doctors />
            <Testimonials />
            <HowItWorks />
            <FAQ />
            <Awards />
            <Blog />
            <MapContact />
            <Footer />
        </div>
    );
}
