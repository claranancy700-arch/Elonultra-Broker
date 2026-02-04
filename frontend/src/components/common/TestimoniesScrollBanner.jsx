import React, { useEffect, useState } from 'react';
import './TestimoniesScrollBanner.css';

export default function TestimoniesScrollBanner() {
  const [testimonies, setTestimonies] = useState([]);

  useEffect(() => {
    // Fetch testimonies from API or use demo data
    const demoTestimonies = [
      { id: 1, name: 'Sarah M.', rating: 5, text: 'Amazing trading platform! Easy to use and great returns' },
      { id: 2, name: 'Michael L.', rating: 5, text: 'Fast withdrawals and excellent customer support team' },
      { id: 3, name: 'Jessica H.', rating: 5, text: 'Perfect for beginners. Made $2,500 in first month!' },
      { id: 4, name: 'David K.', rating: 5, text: 'Professional interface with real-time market data' },
      { id: 5, name: 'Emma T.', rating: 5, text: 'Best crypto trading app I\'ve ever used. Highly recommend!' },
    ];
    setTestimonies(demoTestimonies);
  }, []);

  if (!testimonies.length) {
    return null;
  }

  // Duplicate testimonies for seamless loop
  const repeatedTestimonies = [...testimonies, ...testimonies];

  return (
    <div className="testimonies-banner">
      <div className="testimonies-banner-content">
        {repeatedTestimonies.map((testimony, index) => (
          <div key={index} className="testimonies-banner-item">
            <strong>⭐ {testimony.name}</strong>
            <p className="testimonies-banner-item-text">{testimony.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
