import db from '../db.js';

// ── SAVE TEST RESULT ─────────────────────────────────────────────────────────
export const saveResult = async (req, res) => {
  try {
    const userId = req.user.id;
    const { text_result, voice_result, face_result, fusion_result } = req.body;

    const modalities_used = [];
    if (text_result) modalities_used.push('text');
    if (voice_result) modalities_used.push('voice');
    if (face_result) modalities_used.push('face');

    const result = await db.run(
      `INSERT INTO test_results
        (user_id, text_result, voice_result, face_result, fusion_result, modalities_used)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        text_result ? JSON.stringify(text_result) : null,
        voice_result ? JSON.stringify(voice_result) : null,
        face_result ? JSON.stringify(face_result) : null,
        fusion_result ? JSON.stringify(fusion_result) : null,
        JSON.stringify(modalities_used),
      ]
    );

    return res.status(201).json({
      message: 'Result saved successfully',
      id: result.lastID,
      user_id: userId,
      modalities_used,
    });
  } catch (err) {
    console.error('Save result error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// ── GET USER'S OWN RESULTS ───────────────────────────────────────────────────
export const getUserResults = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 10;
    const offset = (page - 1) * pageSize;

    const totalRow = await db.get(
      'SELECT COUNT(*) AS total FROM test_results WHERE user_id = ?',
      [userId]
    );
    const total = totalRow.total;

    const rows = await db.all(
      `SELECT id, user_id, text_result, voice_result, face_result,
              fusion_result, modalities_used, created_at, updated_at
       FROM test_results WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    // Parse JSON fields
    const results = rows.map(parseJsonFields);

    return res.json({
      results,
      total,
      page,
      page_size: pageSize,
      pages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('Get results error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// helper ─────────────────────────────────────────────────────────────────────
function parseJsonFields(row) {
  const fields = ['text_result', 'voice_result', 'face_result', 'fusion_result', 'modalities_used'];
  const parsed = { ...row };
  for (const f of fields) {
    if (parsed[f] && typeof parsed[f] === 'string') {
      try { parsed[f] = JSON.parse(parsed[f]); } catch (_) {}
    }
  }
  return parsed;
}
