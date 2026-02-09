const express = require("express");
const router = express.Router();
const db = require("../db");
const { verifyAdmin } = require("../middleware/auth");

// Testimony generation templates for realistic auto-generation
const firstNames = ["John", "Sarah", "Michael", "Emma", "David", "Lisa", "James", "Jennifer", "Robert", "Maria", "William", "Patricia", "Richard", "Linda", "Joseph", "Barbara", "Thomas", "Nancy", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const titles = ["CEO", "Founder", "Entrepreneur", "Investor", "Trader", "CFO", "Business Owner", "Hedge Fund Manager", "Financial Advisor", "Startup Founder", "Day Trader", "Portfolio Manager", "Tech Executive", "Real Estate Investor", "Consultant"];
const companies = ["Tech Startups Inc", "Capital Ventures", "Trading Solutions", "Crypto Funds LLC", "Digital Assets Co", "Investment Partners", "Global Finance Group", "Enterprise Solutions", "Innovation Labs", "Future Finance", "Digital Wealth", "Blockchain Corp", "Smart Trading", "Asset Management Co", "Venture Capital Group"];

const testimonyTemplates = [
  "I completed my withdrawal of {amount} - finally have my profits!",
  "Just deposited {amount} and trading is going smooth. Loving the platform!",
  "My balance hit {amount} today. Best decision ever joining ELON-ULTRA",
  "Withdrew {amount} yesterday, got it instantly. Zero issues!",
  "Trading {amount} and already seeing great returns. This platform rocks!",
  "Completed my first deposit of {amount} - excited to start trading!",
  "Made my first trade, profit incoming! {amount} in earnings",
  "Just hit {amount} in total gains. Dream is becoming reality!",
  "Withdrew {amount} successfully. No hidden fees, no drama!",
  "My portfolio grew to {amount}. ELON-ULTRA is the real deal",
  "Completed {amount} in transactions today alone. So easy to use!",
  "Just got my {amount} withdrawal confirmed. Amazing service!",
  "Trading with {amount} and it's going perfectly. Highly recommend!",
  "My account balance jumped to {amount} this week. Insane!",
  "Completed deposit of {amount}, ready to make some gains!",
  "Withdrew {amount} profit. Best trading platform I've used!",
  "Started with {amount}, already seeing positive returns!",
  "Just made {amount} in profit. ELON-ULTRA FTW!",
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

  const rating = Math.random() > 0.1 ? 5 : (Math.random() > 0.5 ? 4 : 5);

  return {
    client_name: firstName + " " + lastName,
    title: title + ", " + company,
    content: content,
    rating: rating,
    is_featured: Math.random() > 0.7,
  };
}

router.get("/generate", async (req, res) => {
  try {
    const testimony = generateTestimony();
    res.json(testimony);
  } catch (err) {
    console.error("Testimony generation error:", err);
    res.status(500).json({ error: "Failed to generate testimony" });
  }
});

router.post("/generate-batch", verifyAdmin, async (req, res) => {
  try {
    const { count = 5 } = req.body;

    if (count < 1 || count > 50) {
      return res.status(400).json({ error: "Count must be between 1 and 50" });
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

    console.log("[Testimonies] Generated and saved " + count + " testimonies");
    res.status(201).json({ generated: count, testimonies: savedTestimonies });
  } catch (err) {
    console.error("Batch generation error:", err);
    res.status(500).json({ error: "Failed to generate testimonies" });
  }
});

module.exports = router;
