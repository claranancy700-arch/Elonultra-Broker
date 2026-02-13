import React, { useEffect, useState } from 'react';
import './TestimoniesScrollBanner.css';
import API from '../../services/api';

export default function TestimoniesScrollBanner() {
  const [testimonies, setTestimonies] = useState([]);

  useEffect(() => {
    fetchTestimonies();
  }, []);

  const fetchTestimonies = async () => {
    try {
      const response = await API.get('/testimonies');
      if (response.data && response.data.length > 0) {
        // Map API response to component structure
        const mappedTestimonies = response.data.map(t => ({
          id: t.id,
          name: t.client_name,
          rating: t.rating || 5,
          text: t.content
        }));
        setTestimonies(mappedTestimonies);
      } else {
        // Fallback if API returns empty
        setTestimonies(getDefaultTestimonies());
      }
    } catch (err) {
      console.error('Failed to fetch testimonies:', err);
      // Use default testimonies only on error
      setTestimonies(getDefaultTestimonies());
    }
  };

  const getDefaultTestimonies = () => [
    { id: 1, name: 'John Smith', rating: 5, text: 'The trading service has been honest, transparent, and consistently efficient.' },
    { id: 2, name: 'Sarah Johnson', rating: 5, text: 'Best crypto trading platform I have used. The customer support is exceptional.' },
    { id: 3, name: 'Michael Chen', rating: 5, text: 'The real-time data and low fees make this my go-to platform.' }
  ];

  if (!testimonies.length) {
    return null;
  }

  // Duplicate testimonies for seamless infinite scroll loop
  const repeatedTestimonies = [...testimonies, ...testimonies];

  return (
    <div className="testimonies-banner">
      <div className="testimonies-banner-content">
        {repeatedTestimonies.map((testimony, index) => (
          <div key={index} className="testimonies-banner-item">
            <strong>★ {testimony.name}</strong>
            <p className="testimonies-banner-item-text">{testimony.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
