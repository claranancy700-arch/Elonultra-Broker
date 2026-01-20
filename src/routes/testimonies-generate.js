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
  "ELON ULTRA ELONS has been honest and transparent from day one. The service agents walk me through each step and I trust the trading updates completely. My portfolio grew {percent}% in under {months} months.",
  "Clear communication, no surprises. The support team is professional and helpful, and the trading service is efficient. Exactly what I wanted as an investor.",
  "I appreciate how transparent the ELON ULTRA ELONS team is. Every trade and fee is explained, and the service agents respond quickly whenever I have questions.",
  "The platform is efficient and straightforward. What stands out is the professionalism of the service agents—they keep me informed without pressure.",
  "Honesty and clarity are rare. Here I always know what’s happening with my account, and the agents are courteous and helpful.",
  "Great experience so far: consistent performance, fast responses, and a service team that genuinely helps. I feel confident relying on this trading service.",
  "I value transparency above everything. ELON ULTRA ELONS delivers that with efficient execution and supportive agents who keep me updated.",
  "Professional, helpful, and efficient—this trading service makes it easy to understand results without any confusing jargon.",
  "I like that the team focuses on clarity. Trades are documented, fees are disclosed, and the agents check in to be sure I’m comfortable.",
  "The service agents are proactive and respectful. The trading service runs smoothly and communicates honestly about progress.",
];

function generateTestimony() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const template = testimonyTemplates[Math.floor(Math.random() * testimonyTemplates.length)];
  
  // Generate random amounts between $500 and $10,000
  const amount = `$${(Math.floor(Math.random() * 9500) + 500).toLocaleString()}`;
  
  const content = template.replace('{amount}', amount);

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
