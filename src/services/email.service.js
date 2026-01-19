/**
 * Email Service
 * Handles all email notifications to users
 * Currently uses console logging (stub). Replace with real email provider (SendGrid, AWS SES, etc.)
 */

const emailService = {
  /**
   * Send balance update notification
   */
  async sendBalanceUpdateEmail(user, oldBalance, newBalance, reason = 'system update') {
    const change = newBalance - oldBalance;
    const percentChange = ((change / oldBalance) * 100).toFixed(2);
    
    const subject = change > 0 ? '📈 Your Balance Increased!' : '📉 Balance Update';
    const body = `
      <h2>${subject}</h2>
      <p>Hello ${user.name || user.email},</p>
      <p>Your account balance has been updated:</p>
      <ul>
        <li><strong>Previous Balance:</strong> $${oldBalance.toFixed(2)}</li>
        <li><strong>New Balance:</strong> $${newBalance.toFixed(2)}</li>
        <li><strong>Change:</strong> $${change.toFixed(2)} (${percentChange}%)</li>
        <li><strong>Reason:</strong> ${reason}</li>
      </ul>
      <p>Log in to your account to view more details.</p>
    `;

    return this.sendEmail(user.email, subject, body);
  },

  /**
   * Send simulator status notification
   */
  async sendSimulatorNotification(user, status, details = {}) {
    const subject = status === 'started' ? '🚀 Simulator Started' : '⏸️ Simulator Paused';
    const body = `
      <h2>${subject}</h2>
      <p>Hello ${user.name || user.email},</p>
      <p>Your balance growth simulator has been ${status}.</p>
      ${details.nextRun ? `<p><strong>Next Run:</strong> ${new Date(details.nextRun).toLocaleString()}</p>` : ''}
      ${details.currentBalance ? `<p><strong>Current Balance:</strong> $${details.currentBalance.toFixed(2)}</p>` : ''}
    `;

    return this.sendEmail(user.email, subject, body);
  },

  /**
   * Send withdrawal notification
   */
  async sendWithdrawalNotification(user, withdrawalAmount, status, reference = null) {
    const subject = status === 'completed' ? '✅ Withdrawal Completed' : '⏳ Withdrawal Pending';
    const body = `
      <h2>${subject}</h2>
      <p>Hello ${user.name || user.email},</p>
      <p>Your withdrawal request has been ${status}:</p>
      <ul>
        <li><strong>Amount:</strong> $${withdrawalAmount.toFixed(2)}</li>
        <li><strong>Status:</strong> ${status}</li>
        ${reference ? `<li><strong>Reference ID:</strong> ${reference}</li>` : ''}
      </ul>
      <p>If you have any questions, please contact support.</p>
    `;

    return this.sendEmail(user.email, subject, body);
  },

  /**
   * Send deposit notification
   */
  async sendDepositNotification(user, depositAmount, walletAddress, currency = 'USDT') {
    const subject = '📥 Deposit Instructions';
    const body = `
      <h2>${subject}</h2>
      <p>Hello ${user.name || user.email},</p>
      <p>Send your ${currency} to the address below:</p>
      <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; word-break: break-all;">
        <code>${walletAddress}</code>
      </div>
      <p><strong>Amount:</strong> $${depositAmount.toFixed(2)}</p>
      <p>Your deposit will be credited within 24 hours of confirmation.</p>
    `;

    return this.sendEmail(user.email, subject, body);
  },

  /**
   * Send trade alert
   */
  async sendTradeAlert(user, trade) {
    const subject = `🔔 Trade Executed: ${trade.type.toUpperCase()} ${trade.asset}`;
    const body = `
      <h2>${subject}</h2>
      <p>Hello ${user.name || user.email},</p>
      <p>A trade has been executed on your account:</p>
      <ul>
        <li><strong>Type:</strong> ${trade.type}</li>
        <li><strong>Asset:</strong> ${trade.asset}</li>
        <li><strong>Amount:</strong> ${trade.amount}</li>
        <li><strong>Price:</strong> $${trade.price}</li>
        <li><strong>Total:</strong> $${trade.total}</li>
        <li><strong>Balance Before:</strong> $${trade.balance_before}</li>
        <li><strong>Balance After:</strong> $${trade.balance_after}</li>
      </ul>
    `;

    return this.sendEmail(user.email, subject, body);
  },

  /**
   * Core email sender (stub - replace with real provider)
   */
  async sendEmail(to, subject, htmlBody) {
    // TODO: Replace with real email provider
    // Example providers:
    // - SendGrid: npm install @sendgrid/mail
    // - AWS SES: aws-sdk
    // - Mailgun: npm install mailgun.js
    // - Nodemailer: npm install nodemailer

    try {
      console.log(`
═══════════════════════════════════════════════════════════
📧 EMAIL NOTIFICATION
To: ${to}
Subject: ${subject}
───────────────────────────────────────────────────────────
${htmlBody}
═══════════════════════════════════════════════════════════
      `);

      // Log to database for audit trail
      // await db.query(
      //   'INSERT INTO email_logs (to, subject, body, sent_at) VALUES ($1, $2, $3, NOW())',
      //   [to, subject, htmlBody]
      // );

      return {
        success: true,
        to,
        subject,
        messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (err) {
      console.error('Email send failed:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  },
};

module.exports = emailService;
