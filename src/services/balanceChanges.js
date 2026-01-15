const db = require('../db');

/**
 * If the balance decreased and the user has no tax_id, record the difference as a trading loss
 * by inserting a trade record with type 'loss'. Assumes caller manages transactions when passing a client.
 */
async function recordLossIfApplicable(clientOrPool, userId, oldBalance, newBalance) {
  const diff = Number(oldBalance) - Number(newBalance);
  console.log('[recordLossIfApplicable] userId:', userId, 'oldBal:', oldBalance, 'newBal:', newBalance, 'diff:', diff);
  if (!(diff > 0)) {
    console.log('[recordLossIfApplicable] No decrease detected, skipping');
    return false; // no decrease
  }

  const client = clientOrPool && typeof clientOrPool.query === 'function' ? clientOrPool : await db.getClient();
  let shouldRelease = client !== clientOrPool;
  try {
    // Check tax_id
    const u = await client.query('SELECT tax_id FROM users WHERE id=$1', [userId]);
    if (!u.rows.length) {
      console.log('[recordLossIfApplicable] User not found');
      return false;
    }
    const taxId = u.rows[0].tax_id;
    console.log('[recordLossIfApplicable] User tax_id:', taxId);
    if (taxId && String(taxId).trim() !== '') {
      console.log('[recordLossIfApplicable] User has tax_id, skipping loss record');
      return false; // has tax ID -> do not treat as trading loss
    }

    // Insert loss trade entry
    console.log('[recordLossIfApplicable] Recording loss of', diff, 'for user', userId);
    await client.query(
      `INSERT INTO trades (user_id, type, asset, amount, price, total, balance_before, balance_after, status, is_simulated, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE,NOW())`,
      [userId, 'loss', 'LOSS', diff, 1, diff, oldBalance, newBalance, 'loss']
    );

    console.log('[recordLossIfApplicable] Loss recorded successfully');
    return true;
  } catch (err) {
    console.error('[balanceChanges] failed to record loss for user', userId, err.message || err);
    return false;
  } finally {
    if (shouldRelease && client && typeof client.release === 'function') client.release();
  }
}

module.exports = { recordLossIfApplicable };
