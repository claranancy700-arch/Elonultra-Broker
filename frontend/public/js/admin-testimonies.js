/* global TestimoniesService */
/* exported showTestimonyForm, editTestimony, deleteTestimony, autoGenerateTestimonies */
/**
 * Admin Testimonies Manager — Handle testimony CRUD operations
 */

(function(){ 
  let allTestimonies = [];
  let currentEditingId = null;

  const baseApi = window.__apiBase || '/api';

async function loadAllTestimonies() {
  try {
    allTestimonies = await TestimoniesService.fetchAll();
    renderTestimoniesList();
  } catch (err) {
    console.error('Failed to load testimonies:', err);
    alert('Failed to load testimonies');
  }
}

function renderTestimoniesList() {
  const container = document.getElementById('testimonies-list');
  if (!allTestimonies || allTestimonies.length === 0) {
    container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted)">No testimonies yet. Add your first one!</p>';
    // Update mobile button count
    const mobileBtn = document.querySelector('.testimonies-mobile-view button');
    if (mobileBtn) {
      mobileBtn.innerHTML = '👁️ View Testimonies (0)';
    }
    return;
  }

  container.innerHTML = allTestimonies.map(t => `
    <div style="border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--card-bg)">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
        <div style="flex:1">
          <strong style="display:block;color:var(--accent)">${t.client_name}</strong>
          ${t.title ? `<small style="color:var(--muted)">${t.title}</small>` : ''}
        </div>
        ${t.rating ? `<div style="color:#ffc107">${'⭐'.repeat(t.rating)}</div>` : ''}
      </div>
      ${t.client_image ? `<img src="${t.client_image}" alt="${t.client_name}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;margin-bottom:8px">` : ''}
      <p style="margin:8px 0;font-size:13px;color:var(--text);line-height:1.5">${t.content.substring(0, 120)}...</p>
      <div style="display:flex;gap:6px;margin-top:8px">
        ${t.is_featured ? '<span style="font-size:11px;background:#ffc107;color:black;padding:2px 8px;border-radius:3px">Featured</span>' : ''}
        <button onclick="editTestimony(${t.id})" class="btn btn-small" style="flex:1">Edit</button>
        <button onclick="deleteTestimony(${t.id})" class="btn btn-small btn-danger" style="flex:1">Delete</button>
      </div>
    </div>
  `).join('');

  // Update mobile button count
  const mobileBtn = document.querySelector('.testimonies-mobile-view button');
  if (mobileBtn) {
    mobileBtn.innerHTML = `👁️ View Testimonies (${allTestimonies.length})`;
  }
}

function showTestimonyForm() {
  currentEditingId = null;
  document.getElementById('testimony-form').style.display = 'grid';
  document.getElementById('testimony-id').value = '';
  document.getElementById('testimony-name').value = '';
  document.getElementById('testimony-title').value = '';
  document.getElementById('testimony-image').value = '';
  document.getElementById('testimony-content').value = '';
  document.getElementById('testimony-rating').value = '5';
  document.getElementById('testimony-featured').checked = false;
  document.getElementById('testimony-name').focus();
}

function cancelTestimonyForm() {
  document.getElementById('testimony-form').style.display = 'none';
  currentEditingId = null;
}

function editTestimony(id) {
  const testimony = allTestimonies.find(t => t.id === id);
  if (!testimony) return;

  currentEditingId = id;
  document.getElementById('testimony-id').value = id;
  document.getElementById('testimony-name').value = testimony.client_name;
  document.getElementById('testimony-title').value = testimony.title || '';
  document.getElementById('testimony-image').value = testimony.client_image || '';
  document.getElementById('testimony-content').value = testimony.content;
  document.getElementById('testimony-rating').value = testimony.rating || 5;
  document.getElementById('testimony-featured').checked = testimony.is_featured || false;
  
  document.getElementById('testimony-form').style.display = 'grid';
  document.getElementById('testimony-name').focus();
}

async function deleteTestimony(id) {
  if (!confirm('Delete this testimony?')) return;

  const adminKey = document.getElementById('admin-key')?.value;
  if (!adminKey) {
    alert('Admin key required. Enter it in the Admin Key field above.');
    return;
  }

  try {
    await TestimoniesService.delete(id, adminKey);
    allTestimonies = allTestimonies.filter(t => t.id !== id);
    renderTestimoniesList();
    alert('Testimony deleted');
  } catch (err) {
    console.error('Deletion failed:', err);
    alert(`Failed to delete: ${err.message}`);
  }
}

async function autoGenerateTestimonies(count = 10) {
  const adminKey = document.getElementById('admin-key')?.value;
  if (!adminKey) {
    alert('Admin key required. Enter it in the Admin Key field above.');
    return;
  }

  if (!confirm(`Generate ${count} AI testimonies? This will create realistic client feedback.`)) {
    return;
  }

  try {
    const response = await fetch(`${baseApi}/testimonies-generate/generate-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate testimonies');
    }

    const result = await response.json();
    allTestimonies.push(...result.testimonies);
    renderTestimoniesList();
    alert(`✅ Generated and saved ${result.generated} testimonies!`);
    console.log('[Auto-Generate] Created', result.generated, 'testimonies');
  } catch (err) {
    console.error('Generation failed:', err);
    alert(`Failed to generate: ${err.message}`);
  }
}

document.getElementById('testimony-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const adminKey = document.getElementById('admin-key')?.value;
  if (!adminKey) {
    alert('Admin key required. Enter it in the Admin Key field above.');
    return;
  }

  const testimony = {
    client_name: document.getElementById('testimony-name').value.trim(),
    title: document.getElementById('testimony-title').value.trim(),
    client_image: document.getElementById('testimony-image').value.trim(),
    content: document.getElementById('testimony-content').value.trim(),
    rating: parseInt(document.getElementById('testimony-rating').value),
    is_featured: document.getElementById('testimony-featured').checked,
  };

  if (!testimony.client_name || !testimony.content) {
    alert('Client name and content are required');
    return;
  }

  try {
    let result;
    if (currentEditingId) {
      result = await TestimoniesService.update(currentEditingId, testimony, adminKey);
      const index = allTestimonies.findIndex(t => t.id === currentEditingId);
      if (index >= 0) allTestimonies[index] = result;
      alert('Testimony updated');
    } else {
      result = await TestimoniesService.create(testimony, adminKey);
      allTestimonies.push(result);
      alert('Testimony added');
    }

    renderTestimoniesList();
    cancelTestimonyForm();
  } catch (err) {
    console.error('Save failed:', err);
    alert(`Failed to save: ${err.message}`);
  }
});

function openTestimoniesModal() {
  const modal = document.getElementById('testimonies-modal');
  const list = document.getElementById('testimonies-modal-list');
  if (!modal || !list) return;

  list.innerHTML = allTestimonies.map(t => `
    <div style="border:1px solid var(--border);border-radius:8px;padding:16px;background:var(--card-bg);margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
        <div style="flex:1">
          <strong style="display:block;color:var(--accent)">${t.client_name}</strong>
          ${t.title ? `<small style="color:var(--muted)">${t.title}</small>` : ''}
        </div>
        ${t.rating ? `<div style="color:#ffc107">${'⭐'.repeat(t.rating)}</div>` : ''}
      </div>
      ${t.client_image ? `<img src="${t.client_image}" alt="${t.client_name}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;margin-bottom:8px">` : ''}
      <p style="margin:8px 0;font-size:14px;color:var(--text);line-height:1.5">${t.content}</p>
      <div style="display:flex;gap:6px;margin-top:8px">
        ${t.is_featured ? '<span style="font-size:11px;background:#ffc107;color:black;padding:2px 8px;border-radius:3px">Featured</span>' : ''}
        <button onclick="editTestimony(${t.id})" class="btn btn-small" style="flex:1">Edit</button>
        <button onclick="deleteTestimony(${t.id})" class="btn btn-small btn-danger" style="flex:1">Delete</button>
      </div>
    </div>
  `).join('');

  // Update mobile button count
  const mobileBtn = document.querySelector('.testimonies-mobile-view button');
  if (mobileBtn) {
    mobileBtn.innerHTML = `👁️ View Testimonies (${allTestimonies.length})`;
  }

  modal.classList.add('active');
}

// Load testimonies on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAllTestimonies);
} else {
  loadAllTestimonies();
}
})();