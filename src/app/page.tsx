'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DivineParallax from '@/components/DivineParallax';
import Header from '@/components/Header';
import '@/styles/divine-parallax.css';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Initialize the divine parallax effect
    new DivineParallax();
  }, []);

  const handleClaimFunds = () => {
    router.push('/login');
  };

  return (
    <>
      {/* Divine Header */}
      <Header />

      {/* Main Parallax Container - exactly like original */}
      <main id="divine-parallax" className="parallax-container">
        {/* Background gradient */}
        <div className="parallax-layer" id="bg-gradient"></div>
        
        {/* Single cloud layer */}
        <div className="parallax-layer clouds-layer" id="clouds-far">
          <img src="/assets/clouds.PNG" alt="Divine Clouds" className="clouds-image" />
        </div>

        {/* The Divine Hand - scroll controlled */}
        <div className="parallax-layer" id="divine-hand">
          <img src="/assets/hand.PNG" alt="Divine Hand" className="hand-image" />
          <div className="hand-glow"></div>
        </div>

        {/* Hero Text - appears when hand animation completes */}
        <div className="parallax-layer hero-text-container">
          <div className="hero-content">
            <h1 className="hero-title">God's Hand</h1>
            <div className="scroll-indicator">
              <p>Scroll For Blessings</p>
              <div className="scroll-arrow">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <p className="hero-subtitle">Where Heaven Hears, and Humanity Helps — One Anonymous Gift at a Time.</p>
            <div className="divine-buttons">
              <button className="divine-btn primary" onClick={handleClaimFunds}>
                <span className="btn-text">Claim Funds</span>
                <div className="btn-glow"></div>
              </button>
              <button className="divine-btn secondary">
                <span className="btn-text">Our Work</span>
                <div className="btn-glow"></div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Scroll space */}
      <div style={{ height: '500vh', background: 'transparent' }}></div>
    </>
  );
}
