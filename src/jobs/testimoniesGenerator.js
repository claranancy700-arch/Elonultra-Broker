const db = require('../db');

// Testimony generation templates for realistic auto-generation
const firstNames = ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "James", "Jennifer", "Robert", "Maria", "William", "Patricia", "Richard", "Linda", "Joseph", "Barbara", "Thomas", "Nancy", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const titles = ["CEO", "Founder", "Entrepreneur", "Investor", "Trader", "CFO", "Business Owner", "Hedge Fund Manager", "Financial Advisor", "Startup Founder", "Day Trader", "Portfolio Manager", "Tech Executive", "Real Estate Investor", "Consultant"];
const companies = ["Tech Startups Inc", "Capital Ventures", "Trading Solutions", "Crypto Funds LLC", "Digital Assets Co", "Investment Partners", "Global Finance Group", "Enterprise Solutions", "Innovation Labs", "Future Finance", "Digital Wealth", "Blockchain Corp", "Smart Trading", "Asset Management Co", "Venture Capital Group"];

const testimonyTemplates = [
  "I completed my withdrawal of {amount} - finally have my profits!",
  "Just deposited {amount} and trading is going smooth. Loving the platform!",
  "My balance hit {amount} today. Best decision ever joining ELON ULTRA ELONS",
  "Withdrew {amount} yesterday, got it instantly. Zero issues!",
  "Trading {amount} and already seeing great returns. This platform rocks!",
  "Completed my first deposit of {amount} - excited to start trading!",
  "Just made my first trade, profit incoming! {amount} in earnings",
  "My account balance jumped to {amount} this week. Dream is becoming reality!",
  "Withdrew {amount} successfully. No hidden fees, no drama!",
  "My portfolio grew to {amount}. ELON ULTRA ELONS is the real deal",
  "Completed {amount} in transactions today alone. So easy to use!",
  "Just got my {amount} withdrawal confirmed. Amazing service!",
  "Trading with {amount} and it's going perfectly. Highly recommend!",
  "My account balance jumped to {amount} this week. Insane!",
  "Completed deposit of {amount}, ready to make some gains!",
  "Withdrew {amount} profit. Best trading platform I've used!",
  "Started with {amount}, already seeing positive returns!",
  "Just made {amount} in profit. ELON ULTRA ELONS FTW!",
  "My first withdrawal of {amount} went through in minutes!",
  "Trading strategy working perfectly. {amount} in gains already!",
];

function generateTestimony() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const title = titles[Math.floor(Math.random() * titles.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const template = testimonyTemplates[Math.floor(Math.random() * testimonyTemplates.length)];

  const amount = "$" + (Math.floor(Math.random() * 9500) + 500).toLocaleString();

  const content = template.replace("{amount}", amount);

  const rating = Math.floor(Math.random() * 3) + 3; // Random rating between 3-5 stars

  return {
    client_name: firstName + " " + lastName,
    title: title + ", " + company,
    content: content,
    rating: rating,
    is_featured: Math.random() > 0.7,
  };
}

async function generateTestimonies(count = 3) {
  try {
    // Check if database is available
    if (!db || !db.query) {
      console.warn('[Testimonies Auto-Generate] Database not ready, skipping this run');
      return [];
    }

    const savedTestimonies = [];
    for (let i = 0; i < count; i++) {
      const testimony = generateTestimony();
      const result = await db.query(
        "INSERT INTO testimonies (client_name, title, content, rating, is_featured) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [testimony.client_name, testimony.title, testimony.content, testimony.rating, testimony.is_featured]
      );
      savedTestimonies.push(result.rows[0]);
    }

    console.log(`[Testimonies Auto-Generate] Generated and saved ${count} testimonies`);
    return savedTestimonies;
  } catch (err) {
    console.error('Auto-generation error:', err.message);
    console.log('Testimonies auto-generation skipped due to database issues');
    return [];
  }
}

function startTestimoniesGenerator({ intervalMs = 24 * 60 * 60 * 1000 } = {}) {
  // run immediately then on interval
  setImmediate(() => generateTestimonies(3));
  setInterval(() => generateTestimonies(3), intervalMs);
  console.log('Testimonies auto-generator started (interval ms):', intervalMs);
}

module.exports = { startTestimoniesGenerator, generateTestimonies };