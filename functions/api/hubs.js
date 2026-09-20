// Cloudflare Pages Function: /api/hubs
// Manages Campus Pickup & Drop Hubs inside Cloudflare D1 SQL database (env.DB)

export async function onRequestGet(context) {
  const { env } = context;

  if (env && env.DB) {
    try {
      const { results } = await env.DB.prepare(
        'SELECT id, name, code, lat, lng, radius_meters, capacity, description, icon FROM hubs ORDER BY id ASC'
      ).all();

      if (results && results.length > 0) {
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (err) {
      console.error('[D1 Hubs GET Error]', err);
    }
  }

  // Fallback initial hubs
  return new Response(JSON.stringify([
    { id: 1, name: "Main Gate", code: "HUB-MG", lat: 24.680029, lng: 84.963476, radius_meters: 25.0, capacity: 30, description: "Primary campus entrance & visitor check." },
    { id: 2, name: "Academic Block", code: "HUB-AB", lat: 24.680167, lng: 84.965313, radius_meters: 25.0, capacity: 100, description: "Main lecture halls & library." },
    { id: 3, name: "Mess / Annapurna", code: "HUB-MS", lat: 24.680614, lng: 84.967928, radius_meters: 25.0, capacity: 50, description: "Central dining hall & cafeteria." },
    { id: 4, name: "Sports Complex / Udaan", code: "HUB-SC", lat: 24.680335, lng: 84.966544, radius_meters: 25.0, capacity: 25, description: "Gymnasium & badminton courts." },
    { id: 5, name: "Tilak & Attri Hostel", code: "HUB-TA", lat: 24.680524, lng: 84.968459, radius_meters: 25.0, capacity: 25, description: "Hostels Tilak and Attri." },
    { id: 6, name: "Azad & Patel Hostel", code: "HUB-AP", lat: 24.681314, lng: 84.968851, radius_meters: 25.0, capacity: 25, description: "Residence blocks Azad and Patel." },
    { id: 7, name: "H9 Hostel", code: "HUB-HSTL", lat: 24.685926, lng: 84.968140, radius_meters: 25.0, capacity: 20, description: "Hostel H9 residence." },
    { id: 8, name: "Siang Hostel", code: "HUB-SB", lat: 24.683914, lng: 84.968275, radius_meters: 25.0, capacity: 80, description: "Siang student accommodation." },
    { id: 9, name: "Gargi Hostel", code: "HUB-GH", lat: 24.682639, lng: 84.968186, radius_meters: 25.0, capacity: 20, description: "Gargi hostel precinct." },
    { id: 10, name: "Aryabhatta Hostel", code: "HUB-AH", lat: 24.680674, lng: 84.967161, radius_meters: 25.0, capacity: 20, description: "Girls student residence." }
  ]), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Add New Designated Campus Hub
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const hub = await request.json();
    const name = (hub.name || '').trim();
    const code = (hub.code || `HUB-${Date.now().toString().slice(-4)}`).trim().toUpperCase();
    const lat = parseFloat(hub.lat) || 24.6818;
    const lng = parseFloat(hub.lng) || 84.9663;
    const radius_meters = parseFloat(hub.radius_meters) || 25.0;
    const capacity = parseInt(hub.capacity) || 25;
    const description = (hub.description || 'Campus cycle designated station').trim();

    if (!name) {
      return new Response(JSON.stringify({ error: 'Hub name is required.' }), { status: 400 });
    }

    if (env && env.DB) {
      const res = await env.DB.prepare(
        'INSERT INTO hubs (name, code, lat, lng, radius_meters, capacity, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(name, code, lat, lng, radius_meters, capacity, description).run();

      const newId = res.meta?.last_row_id || Date.now();
      return new Response(JSON.stringify({
        id: newId, name, code, lat, lng, radius_meters, capacity, description
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      id: Date.now(), name, code, lat, lng, radius_meters, capacity, description
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// Update Existing Designated Campus Hub
export async function onRequestPut(context) {
  const { request, env } = context;

  try {
    const hub = await request.json();
    if (!hub.id) {
      return new Response(JSON.stringify({ error: 'Hub ID is required.' }), { status: 400 });
    }

    const id = parseInt(hub.id);
    const name = hub.name.trim();
    const code = hub.code.trim().toUpperCase();
    const lat = parseFloat(hub.lat);
    const lng = parseFloat(hub.lng);
    const radius_meters = parseFloat(hub.radius_meters) || 60.0;
    const capacity = parseInt(hub.capacity) || 25;
    const description = (hub.description || '').trim();

    if (env && env.DB) {
      await env.DB.prepare(
        'UPDATE hubs SET name = ?, code = ?, lat = ?, lng = ?, radius_meters = ?, capacity = ?, description = ? WHERE id = ?'
      ).bind(name, code, lat, lng, radius_meters, capacity, description, id).run();
    }

    return new Response(JSON.stringify({
      id, name, code, lat, lng, radius_meters, capacity, description
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// Delete / Remove Designated Campus Hub
export async function onRequestDelete(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const idParam = url.searchParams.get('id');

  try {
    if (!idParam) {
      return new Response(JSON.stringify({ error: 'Hub id query param required.' }), { status: 400 });
    }

    const id = parseInt(idParam);
    if (env && env.DB) {
      await env.DB.prepare('DELETE FROM hubs WHERE id = ?').bind(id).run();
    }

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
