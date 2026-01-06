const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin } = require('../middleware/auth');

// Testimony generation templates for realistic auto-generation
const firstNames = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Jennifer', 'Robert', 'Maria', 'William', 'Patricia', 'Richard', 'Linda', 'Joseph', 'Barbara', 'Thomas', 'Nancy', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const titles = ['CEO', 'Founder', 'Entrepreneur', 'Investor', 'Trader', 'CFO', 'Business Owner', 'Hedge Fund Manager', 'Financial Advisor', 'Startup Founder', 'Day Trader', 'Portfolio Manager', 'Tech Executive', 'Real Estate Investor', 'Consultant'];
const companies = ['Tech Startups Inc', 'Capital Ventures', 'Trading Solutions', 'Crypto Funds LLC', 'Digital Assets Co', 'Investment Partners', 'Global Finance Group', 'Enterprise Solutions', 'Innovation Labs', 'Future Finance', 'Digital Wealth', 'Blockchain Corp', 'Smart Trading', 'Asset Management Co', 'Venture Capital Group'];

const testimonyTemplates = [
  "ELON ULTRA ELONS has completely transformed my crypto trading experience. The platform is intuitive, secure, and offers real-time data that I rely on every single day. I've increased my portfolio by {percent}% since joining.",
  "I was skeptical at first, but after using ELON ULTRA ELONS for {months} months, I can confidently say it's the best trading platform I've used. The customer support is exceptional.",
  "Finally found a crypto trading platform I can trust! ELON ULTRA ELONS combines professional-grade tools with an easy-to-use interface. Highly recommended for both beginners and experienced traders.",
  "The speed of execution on ELON ULTRA ELONS is unmatched. I've saved thousands in fees compared to other exchanges. Best decision I made for my portfolio.",
  "As a professional trader, I have high standards. ELON ULTRA ELONS exceeded all of them. The real-time market data, fast API, and low fees make it my go-to platform.",
  "ELON ULTRA ELONS helped me achieve my financial goals faster than I expected. The tools are powerful, the interface is clean, and the security is top-notch.",
  "I've recommended ELON ULTRA ELONS to all my trading friends. It's refreshing to use a platform that actually cares about user experience and security.",
  "Trading on ELON ULTRA ELONS feels like using a professional-grade platform, but with beginner-friendly features. Perfect balance!",
  "The best part? No hidden fees, instant withdrawals, and 24/7 customer support. ELON ULTRA ELONS is a game-changer.",
  "I started with just $500 and built it to a substantial portfolio. ELON ULTRA ELONS' tools made it possible. Grateful for this platform!",
];

function generateTestimony() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const template = testimonyTemplates[Math.floor(Math.random() * testimonyTemplates.length)];
  const percent = Math.floor(Math.random() * 150) + 25; // 25-175%
  const months = Math.floor(Math.random() * 18) + 3; // 3-20 months
  
  const content = template
    .replace('{percent}', percent)
    .replace('{months}', months);

  const rating = Math.random() > 0.1 ? 5 : (Math.random() > 0.5 ? 4 : 5); // 90% 5-star, 10% 4-star

  return {
    client_name: `${firstName} ${lastName}`,
    title: `${title}, ${company}`,
    content: content,
    rating: rating,
    is_featured: Math.random() > 0.7, // 30% chance to be featured
  };
}

// GET generate random testimony (no auth needed for demo, but can add admin-only if needed)
router.get('/generate', async (req, res) => {
  try {
    const testimony = generateTestimony();
    res.json(testimony);
  } catch (err) {
    console.error('Testimony generation error:', err);
    res.status(500).json({ error: 'Failed to generate testimony' });
  }
});

// POST generate and save multiple testimonies (admin only)
router.post('/generate-batch', verifyAdmin, async (req, res) => {
  try {
    const { count = 5 } = req.body;

    if (count < 1 || count > 50) {
      return res.status(400).json({ error: 'Count must be between 1 and 50' });
    }

    const savedTestimonies = [];
    for (let i = 0; i < count; i++) {
      const testimony = generateTestimony();
      const result = await db.query(
        `INSERT INTO testimonies (client_name, title, content, rating, is_featured)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [testimony.client_name, testimony.title, testimony.content, testimony.rating, testimony.is_featured]
      );
      savedTestimonies.push(result.rows[0]);
    }

    console.log(`[Testimonies] Generated and saved ${count} testimonies`);
    res.status(201).json({ generated: count, testimonies: savedTestimonies });
  } catch (err) {
    console.error('Batch generation error:', err);
    res.status(500).json({ error: 'Failed to generate testimonies' });
  }
});

module.exports = router;
