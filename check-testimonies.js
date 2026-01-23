const db = require('./src/db');

async function checkTestimonies() {
  try {
    const result = await db.query('SELECT client_name, content, rating FROM testimonies ORDER BY id');
    console.log('Local testimonies:');
    result.rows.forEach((row, i) => {
      console.log((i+1) + '. ' + row.client_name + ' - "' + row.content.substring(0, 50) + '..." ' + '⭐'.repeat(row.rating));
    });
  } catch (err) {
    console.log('Database error:', err.message);
  } finally {
    process.exit();
  }
}

checkTestimonies();