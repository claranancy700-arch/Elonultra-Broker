const db = require('./src/db');

const testimonies = [
  { client_name: 'John Smith', title: 'CEO, Tech Ventures', content: 'ELON ULTRA ELONS has completely transformed my crypto trading experience. The platform is intuitive, secure, and I have increased my portfolio by 85% since joining. Highly recommended!', rating: 5, is_featured: true },
  { client_name: 'Sarah Johnson', title: 'Entrepreneur', content: 'Best crypto trading platform I have used. The customer support is exceptional and the real-time market data is invaluable. Five stars!', rating: 5, is_featured: true },
  { client_name: 'Michael Chen', title: 'Hedge Fund Manager', content: 'The real-time data and low fees make ELON ULTRA ELONS my go-to platform. Professional-grade tools at an unbeatable price point.', rating: 5, is_featured: true },
  { client_name: 'Emma Wilson', title: 'Investment Advisor', content: 'Professional tools with a beginner-friendly interface. This platform has the perfect balance between power and simplicity.', rating: 5, is_featured: false },
  { client_name: 'David Martinez', title: 'Day Trader', content: 'Faster execution than any other exchange I have used. I have saved thousands in fees since switching to ELON ULTRA ELONS.', rating: 5, is_featured: false },
  { client_name: 'Lisa Anderson', title: 'Financial Advisor', content: 'I recommend ELON ULTRA ELONS to all my clients. The security is top-notch and the interface is incredibly user-friendly.', rating: 5, is_featured: false },
  { client_name: 'Robert Taylor', title: 'Startup Founder', content: 'Trading on ELON ULTRA ELONS feels like using a professional-grade platform. Absolutely love the API documentation and support.', rating: 5, is_featured: false },
];

(async () => {
  try {
    for (const t of testimonies) {
      await db.query(
        'INSERT INTO testimonies (client_name, title, content, rating, is_featured) VALUES ($1, $2, $3, $4, $5)',
        [t.client_name, t.title, t.content, t.rating, t.is_featured]
      );
    }
    console.log('✅ Successfully added 7 testimonies to database');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding testimonies:', err.message);
    process.exit(1);
  }
})();
