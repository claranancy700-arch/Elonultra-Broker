/**
 * Testimonies Module — Manage and display customer testimonials
 */

const TestimoniesService = {
  API_BASE: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? `http://${window.location.hostname}:5001/api`
    : '/api',

  // Fetch all testimonies (public)
  async fetchAll() {
    try {
      const response = await fetch(`${this.API_BASE}/testimonies`);
      if (!response.ok) throw new Error(`Failed to fetch testimonies: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Testimonies fetch error:', err);
      return [];
    }
  },

  // Fetch featured testimonies only
  async fetchFeatured() {
    try {
      const response = await fetch(`${this.API_BASE}/testimonies?featured=true`);
      if (!response.ok) throw new Error(`Failed to fetch featured testimonies: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Featured testimonies fetch error:', err);
      return [];
    }
  },

  // Add new testimony (admin only)
  async create(testimony, adminKey) {
    try {
      const response = await fetch(`${this.API_BASE}/testimonies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(testimony),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to create testimony: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Testimony creation error:', err);
      throw err;
    }
  },

  // Update testimony (admin only)
  async update(id, testimony, adminKey) {
    try {
      const response = await fetch(`${this.API_BASE}/testimonies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(testimony),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to update testimony: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Testimony update error:', err);
      throw err;
    }
  },

  // Delete testimony (admin only)
  async delete(id, adminKey) {
    try {
      const response = await fetch(`${this.API_BASE}/testimonies/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to delete testimony: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Testimony deletion error:', err);
      throw err;
    }
  },

  // Render testimonies as HTML cards
  renderCards(testimonies) {
    if (!testimonies || testimonies.length === 0) {
      return '<p style="text-align:center;color:var(--muted)">No testimonies yet</p>';
    }

    return testimonies.map(t => `
      <div class="testimony-card" style="border:1px solid var(--border);border-radius:8px;padding:20px;margin-bottom:16px;background:var(--card-bg)">
        <div style="display:flex;align-items:center;margin-bottom:12px">
          ${t.client_image ? `<img src="${t.client_image}" alt="${t.client_name}" style="width:50px;height:50px;border-radius:50%;margin-right:12px;object-fit:cover">` : `<div style="width:50px;height:50px;border-radius:50%;margin-right:12px;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold">${t.client_name.charAt(0)}</div>`}
          <div>
            <strong style="display:block">${t.client_name}</strong>
            ${t.title ? `<small style="color:var(--muted)">${t.title}</small>` : ''}
          </div>
          ${t.rating ? `<div style="margin-left:auto"><span style="color:#ffc107">${'⭐'.repeat(t.rating)}</span></div>` : ''}
        </div>
        <p style="margin:0;color:var(--text);line-height:1.6">${t.content}</p>
      </div>
    `).join('');
  },
};
