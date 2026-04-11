import React, { useEffect, useState } from 'react';
import './TestimoniesScrollBanner.css';
import API from '../../services/api';

const CYCLE_MS = 5000;      // ms each card is shown

const DEFAULT_TESTIMONIES = [
  { id: 1, name: 'John Smith',     rating: 5, text: 'The trading service has been honest, transparent, and consistently efficient.' },
  { id: 2, name: 'Sarah Johnson',  rating: 5, text: 'Best crypto trading platform I have used. The customer support is exceptional.' },
  { id: 3, name: 'Michael Chen',   rating: 5, text: 'The real-time data and low fees make this my go-to platform for daily trades.' },
  { id: 4, name: 'Emily Davis',    rating: 5, text: 'Fast withdrawals and a clean interface. Highly recommend to anyone serious about crypto.' },
  { id: 5, name: 'Robert Kim',     rating: 5, text: 'Transparent fees and reliable performance. My portfolio has grown steadily.' },
];

export default function TestimoniesScrollBanner() {
  const [testimonies, setTestimonies] = useState(DEFAULT_TESTIMONIES);
  const [cycleIndex, setCycleIndex] = useState(0);

  // Auto-cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setCycleIndex(i => i + 1);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  // Fetch real testimonies from API
  useEffect(() => {
    const fetchTestimonies = async (attempt = 1) => {
      try {
        const response = await API.get('/testimonies');
        if (response.data && response.data.length > 0) {
          setTestimonies(response.data.map(t => ({
            id: t.id,
            name: t.client_name,
            rating: t.rating || 5,
            text: t.content,
          })));
        }
      } catch {
        if (attempt < 3) setTimeout(() => fetchTestimonies(attempt + 1), 2000 * attempt);
      }
    };
    fetchTestimonies();
  }, []);

  const len = testimonies.length;

  // Single card for both desktop and mobile
  const activeCard = testimonies[cycleIndex % len];

  const renderCard = (testimony, key) => (
    <article key={key} className="testimonies-banner-item">
      <div className="testimonies-banner-item-header">
        <span className="testimonies-banner-kicker">Client Pulse</span>
        <span className="testimonies-banner-rating" aria-label={`${testimony.rating} stars`}>
          {'★'.repeat(Math.max(1, Math.min(5, testimony.rating || 5)))}
        </span>
      </div>
      <strong className="testimonies-banner-name">{testimony.name}</strong>
      <p className="testimonies-banner-item-text">{testimony.text}</p>
    </article>
  );

  return (
    <section className="testimonies-banner" aria-label="Client testimonies">
      <div className="testimonies-banner-shell">

        {/* Single card — same on desktop and mobile */}
        {renderCard(activeCard, `c-${cycleIndex}`)}

      </div>
    </section>
  );
}
