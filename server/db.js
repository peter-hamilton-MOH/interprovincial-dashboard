import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_PATH = path.join(__dirname, 'intelligence_hub.sqlite');
export const DATA_DIR = path.join(__dirname, '..', 'data');

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;

  // Strip BOM if present
  const cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cur);
        cur = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(cur);
        if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
          rows.push(row);
        }
        row = [];
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
      rows.push(row);
    }
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < headers.length) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = r[j] !== undefined ? r[j].trim() : '';
    }
    result.push(obj);
  }
  return result;
}

const toBoolInt = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const s = String(val).toLowerCase();
  return s === 'true' || s === '1' ? 1 : 0;
};

const toNumOrNull = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

// Placeholder content from the news.png mockup
export const BRIEF_PLACEHOLDER_HIGHLIGHTS = [
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
  'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
  'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?',
];

const BRIEF_PLACEHOLDER_NOTE =
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae.';

function seedBriefIfEmpty(db) {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM weekly_briefs').get();
  if (c > 0) return;

  const briefId = Number(
    db.prepare('INSERT INTO weekly_briefs (week_start) VALUES (?)').run('2026-01-20').lastInsertRowid
  );

  const insertHighlight = db.prepare('INSERT INTO brief_highlights (brief_id, position, body) VALUES (?, ?, ?)');
  BRIEF_PLACEHOLDER_HIGHLIGHTS.forEach((text, i) => insertHighlight.run(briefId, i + 1, text));

  const insertNote = db.prepare('INSERT INTO brief_notes (brief_id, author, body, created_at) VALUES (?, ?, ?, ?)');
  const noteTimes = [
    '2026-01-21T15:00:00.000Z',
    '2026-01-22T10:30:00.000Z',
    '2026-01-23T09:15:00.000Z',
    '2026-01-24T14:00:00.000Z',
  ];
  noteTimes.forEach((createdAt) => insertNote.run(briefId, 'Peter', BRIEF_PLACEHOLDER_NOTE, createdAt));
}

// week_id is the Saturday before the Sunday-start brief week it summarizes.
function importWeeklySummaries(db) {
  const csvPath = path.join(DATA_DIR, 'weekly_summaries.csv');
  if (!fs.existsSync(csvPath)) return;
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));

  const findBrief = db.prepare(
    'SELECT brief_id FROM weekly_briefs WHERE week_start BETWEEN ? AND ? ORDER BY week_start LIMIT 1'
  );
  const insertBrief = db.prepare('INSERT INTO weekly_briefs (week_start) VALUES (?)');
  const deleteHighlights = db.prepare('DELETE FROM brief_highlights WHERE brief_id = ?');
  const insertHighlight = db.prepare('INSERT INTO brief_highlights (brief_id, position, body) VALUES (?, ?, ?)');

  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('DELETE FROM brief_highlights;');
    for (const row of rows) {
      const date = new Date(`${row.week_id}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) continue;
      const daysToNextSunday = (7 - date.getUTCDay()) % 7 || 7;
      const weekStart = new Date(date.getTime() + daysToNextSunday * 86400000).toISOString().slice(0, 10);
      const weekEnd = new Date(date.getTime() + (daysToNextSunday + 6) * 86400000).toISOString().slice(0, 10);

      const existing = findBrief.get(weekStart, weekEnd);
      const briefId = existing
        ? existing.brief_id
        : Number(insertBrief.run(weekStart).lastInsertRowid);

      const bullets = row.summary_bullets
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*-\s*/, '').trim())
        .filter(Boolean);

      deleteHighlights.run(briefId);
      bullets.forEach((body, i) => insertHighlight.run(briefId, i + 1, body));
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function initDatabase(forceReseed = false) {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS intelligence_items (
      item_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      published_at TEXT,
      published_date TEXT,
      source_name TEXT,
      source_type TEXT,
      jurisdiction TEXT,
      topic_tag TEXT,
      people_entities TEXT,
      source_url TEXT,
      ingested_at TEXT,
      is_manual_item INTEGER DEFAULT 0,
      is_health_related INTEGER DEFAULT 1,
      is_funding_related INTEGER DEFAULT 0,
      is_government_source INTEGER DEFAULT 0,
      is_minister_related INTEGER DEFAULT 0,
      is_research_or_media INTEGER DEFAULT 0,
      is_operational_advisory INTEGER DEFAULT 0,
      content_section TEXT,
      display_source_group TEXT,
      jurisdiction_sort_order INTEGER DEFAULT 99,
      user_vote INTEGER DEFAULT 0,
      is_bookmarked INTEGER DEFAULT 0,
      user_notes TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_items_published_date ON intelligence_items(published_date DESC);
    CREATE INDEX IF NOT EXISTS idx_items_jurisdiction ON intelligence_items(jurisdiction);
    CREATE INDEX IF NOT EXISTS idx_items_content_section ON intelligence_items(content_section);
    CREATE INDEX IF NOT EXISTS idx_items_topic_tag ON intelligence_items(topic_tag);
    CREATE INDEX IF NOT EXISTS idx_items_source_group ON intelligence_items(display_source_group);

    CREATE TABLE IF NOT EXISTS funding_dashboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      jurisdiction TEXT NOT NULL,
      total_expenditure_nominal REAL,
      yoy_growth_percent REAL,
      per_capita_expenditure REAL,
      UNIQUE(year, jurisdiction)
    );

    CREATE TABLE IF NOT EXISTS funding_latest_snapshot (
      jurisdiction TEXT PRIMARY KEY,
      year INTEGER NOT NULL,
      total_expenditure_nominal REAL,
      yoy_growth_percent REAL,
      per_capita_expenditure REAL
    );

    CREATE TABLE IF NOT EXISTS funding_category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jurisdiction TEXT NOT NULL,
      year INTEGER NOT NULL,
      hospitals REAL,
      other_institutions REAL,
      physicians REAL,
      other_professionals REAL,
      drugs REAL,
      public_health REAL,
      administration REAL,
      home_and_community_care REAL,
      other_health_spending_net_hcc REAL,
      covid_response_funding REAL,
      sub_total REAL,
      UNIQUE(jurisdiction, year)
    );

    CREATE TABLE IF NOT EXISTS funding_age_sex (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      jurisdiction TEXT NOT NULL,
      sex_group TEXT NOT NULL,
      age_group TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      service_category TEXT NOT NULL,
      value REAL
    );

    CREATE INDEX IF NOT EXISTS idx_age_sex_lookup
      ON funding_age_sex(year, jurisdiction, sex_group, metric_type, service_category);

    CREATE TABLE IF NOT EXISTS content_section_rollups (
      content_section TEXT PRIMARY KEY,
      item_count INTEGER
    );

    CREATE TABLE IF NOT EXISTS jurisdiction_rollups (
      jurisdiction TEXT PRIMARY KEY,
      jurisdiction_sort_order INTEGER,
      item_count INTEGER
    );

    CREATE TABLE IF NOT EXISTS source_group_rollups (
      display_source_group TEXT PRIMARY KEY,
      item_count INTEGER
    );

    CREATE TABLE IF NOT EXISTS topic_rollups (
      topic_tag TEXT PRIMARY KEY,
      item_count INTEGER
    );

    CREATE TABLE IF NOT EXISTS pipeline_run_audit (
      run_timestamp TEXT PRIMARY KEY,
      notebook_statuses TEXT,
      notebook_durations TEXT,
      raw_before INTEGER,
      raw_after INTEGER,
      silver_deduped_before INTEGER,
      silver_deduped_after INTEGER,
      silver_clean_before INTEGER,
      silver_clean_after INTEGER,
      silver_tagged_before INTEGER,
      silver_tagged_after INTEGER,
      gold_before INTEGER,
      gold_after INTEGER,
      duplicate_item_id_count INTEGER,
      missing_published_at_count INTEGER,
      final_GO_NO_GO_status TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_briefs (
      brief_id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS brief_highlights (
      highlight_id INTEGER PRIMARY KEY AUTOINCREMENT,
      brief_id INTEGER NOT NULL REFERENCES weekly_briefs(brief_id),
      position INTEGER NOT NULL,
      body TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brief_notes (
      note_id INTEGER PRIMARY KEY AUTOINCREMENT,
      brief_id INTEGER NOT NULL REFERENCES weekly_briefs(brief_id),
      author TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_brief_notes_brief ON brief_notes(brief_id, created_at DESC);
  `);
  seedBriefIfEmpty(db);
  importWeeklySummaries(db);

  const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM intelligence_items').get().cnt;
  if (existingCount > 0 && !forceReseed) {
    return db;
  }

  console.log('Seeding SQLite database from /data CSV files...');

  // Preserve any existing user votes/bookmarks if reseeding
  const existingFeedback = new Map();
  if (existingCount > 0) {
    const rows = db
      .prepare("SELECT item_id, user_vote, is_bookmarked, user_notes FROM intelligence_items WHERE user_vote != 0 OR is_bookmarked != 0 OR user_notes != ''")
      .all();
    for (const r of rows) {
      existingFeedback.set(r.item_id, r);
    }
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    // 1. intelligence_items_gold.csv
    const itemsCsv = fs.readFileSync(path.join(DATA_DIR, 'intelligence_items_gold.csv'), 'utf8');
    const items = parseCSV(itemsCsv);
    db.exec('DELETE FROM intelligence_items WHERE is_manual_item = 0;');

    const insertItem = db.prepare(`
      INSERT OR REPLACE INTO intelligence_items (
        item_id, title, summary, published_at, published_date, source_name, source_type,
        jurisdiction, topic_tag, people_entities, source_url, ingested_at,
        is_manual_item, is_health_related, is_funding_related, is_government_source,
        is_minister_related, is_research_or_media, is_operational_advisory,
        content_section, display_source_group, jurisdiction_sort_order,
        user_vote, is_bookmarked, user_notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?
      )
    `);

    for (const item of items) {
      if (!item.item_id) continue;
      const pubDate = item.published_at ? item.published_at.slice(0, 10) : null;
      const fb = existingFeedback.get(item.item_id);
      insertItem.run(
        item.item_id,
        item.title || 'Untitled',
        item.summary || '',
        item.published_at || null,
        pubDate,
        item.source_name || '',
        item.source_type || '',
        item.jurisdiction || 'Federal',
        item.topic_tag || 'Other',
        item.people_entities || '',
        item.source_url || '',
        item.ingested_at || null,
        toBoolInt(item.is_manual_item),
        toBoolInt(item.is_health_related),
        toBoolInt(item.is_funding_related),
        toBoolInt(item.is_government_source),
        toBoolInt(item.is_minister_related),
        toBoolInt(item.is_research_or_media),
        toBoolInt(item.is_operational_advisory),
        item.content_section || 'Government Announcements',
        item.display_source_group || 'Government Newsroom',
        toNumOrNull(item.jurisdiction_sort_order) ?? 99,
        fb ? fb.user_vote : 0,
        fb ? fb.is_bookmarked : 0,
        fb ? fb.user_notes : ''
      );
    }

    // 2. funding_dashboard_gold.csv (deduplicating rows where yoy_growth_percent is empty on duplicate 2025 rows)
    const fDashCsv = fs.readFileSync(path.join(DATA_DIR, 'funding_dashboard_gold.csv'), 'utf8');
    const fDashRows = parseCSV(fDashCsv);
    db.exec('DELETE FROM funding_dashboard;');
    const dashMap = new Map();
    for (const r of fDashRows) {
      const key = `${r.year}__${r.jurisdiction}`;
      const existing = dashMap.get(key);
      const yoy = toNumOrNull(r.yoy_growth_percent);
      if (!existing || (existing.yoy_growth_percent === null && yoy !== null)) {
        dashMap.set(key, {
          year: Number(r.year),
          jurisdiction: r.jurisdiction,
          total_expenditure_nominal: toNumOrNull(r.total_expenditure_nominal),
          yoy_growth_percent: yoy,
          per_capita_expenditure: toNumOrNull(r.per_capita_expenditure),
        });
      }
    }
    const insertDash = db.prepare(`
      INSERT INTO funding_dashboard (year, jurisdiction, total_expenditure_nominal, yoy_growth_percent, per_capita_expenditure)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const val of dashMap.values()) {
      insertDash.run(
        val.year,
        val.jurisdiction,
        val.total_expenditure_nominal,
        val.yoy_growth_percent,
        val.per_capita_expenditure
      );
    }

    // 3. funding_latest_snapshot.csv
    const fSnapCsv = fs.readFileSync(path.join(DATA_DIR, 'funding_latest_snapshot.csv'), 'utf8');
    const fSnapRows = parseCSV(fSnapCsv);
    db.exec('DELETE FROM funding_latest_snapshot;');
    const snapMap = new Map();
    for (const r of fSnapRows) {
      const existing = snapMap.get(r.jurisdiction);
      const yoy = toNumOrNull(r.yoy_growth_percent);
      if (!existing || (existing.yoy_growth_percent === null && yoy !== null)) {
        snapMap.set(r.jurisdiction, {
          jurisdiction: r.jurisdiction,
          year: Number(r.year),
          total_expenditure_nominal: toNumOrNull(r.total_expenditure_nominal),
          yoy_growth_percent: yoy,
          per_capita_expenditure: toNumOrNull(r.per_capita_expenditure),
        });
      }
    }
    const insertSnap = db.prepare(`
      INSERT INTO funding_latest_snapshot (jurisdiction, year, total_expenditure_nominal, yoy_growth_percent, per_capita_expenditure)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const val of snapMap.values()) {
      insertSnap.run(
        val.jurisdiction,
        val.year,
        val.total_expenditure_nominal,
        val.yoy_growth_percent,
        val.per_capita_expenditure
      );
    }

    // 4. funding_category_gold.csv
    const fCatCsv = fs.readFileSync(path.join(DATA_DIR, 'funding_category_gold.csv'), 'utf8');
    const fCatRows = parseCSV(fCatCsv);
    db.exec('DELETE FROM funding_category;');
    const insertCat = db.prepare(`
      INSERT OR REPLACE INTO funding_category (
        jurisdiction, year, hospitals, other_institutions, physicians, other_professionals,
        drugs, public_health, administration, home_and_community_care,
        other_health_spending_net_hcc, covid_response_funding, sub_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of fCatRows) {
      insertCat.run(
        r.jurisdiction,
        Number(r.year),
        toNumOrNull(r.hospitals),
        toNumOrNull(r.other_institutions),
        toNumOrNull(r.physicians),
        toNumOrNull(r.other_professionals),
        toNumOrNull(r.drugs),
        toNumOrNull(r.public_health),
        toNumOrNull(r.administration),
        toNumOrNull(r.home_and_community_care),
        toNumOrNull(r.other_health_spending_net_hcc),
        toNumOrNull(r.covid_response_funding),
        toNumOrNull(r.sub_total)
      );
    }

    // 5. funding_age_sex_gold.csv
    const fAgeCsv = fs.readFileSync(path.join(DATA_DIR, 'funding_age_sex_gold.csv'), 'utf8');
    const fAgeRows = parseCSV(fAgeCsv);
    db.exec('DELETE FROM funding_age_sex;');
    const insertAge = db.prepare(`
      INSERT INTO funding_age_sex (year, jurisdiction, sex_group, age_group, metric_type, service_category, value)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of fAgeRows) {
      insertAge.run(
        Number(r.year),
        r.jurisdiction,
        r.sex_group,
        r.age_group,
        r.metric_type,
        r.service_category,
        toNumOrNull(r.value)
      );
    }

    // 6. Rollups & Pipeline Audit
    const csRows = parseCSV(fs.readFileSync(path.join(DATA_DIR, 'content_section_rollups.csv'), 'utf8'));
    db.exec('DELETE FROM content_section_rollups;');
    const insCs = db.prepare('INSERT INTO content_section_rollups (content_section, item_count) VALUES (?, ?)');
    for (const r of csRows) insCs.run(r.content_section, Number(r.item_count));

    const jrRows = parseCSV(fs.readFileSync(path.join(DATA_DIR, 'jurisdiction_rollups.csv'), 'utf8'));
    db.exec('DELETE FROM jurisdiction_rollups;');
    const insJr = db.prepare('INSERT INTO jurisdiction_rollups (jurisdiction, jurisdiction_sort_order, item_count) VALUES (?, ?, ?)');
    for (const r of jrRows) insJr.run(r.jurisdiction, Number(r.jurisdiction_sort_order), Number(r.item_count));

    const sgRows = parseCSV(fs.readFileSync(path.join(DATA_DIR, 'source_group_rollups.csv'), 'utf8'));
    db.exec('DELETE FROM source_group_rollups;');
    const insSg = db.prepare('INSERT INTO source_group_rollups (display_source_group, item_count) VALUES (?, ?)');
    for (const r of sgRows) insSg.run(r.display_source_group, Number(r.item_count));

    const trRows = parseCSV(fs.readFileSync(path.join(DATA_DIR, 'topic_rollups.csv'), 'utf8'));
    db.exec('DELETE FROM topic_rollups;');
    const insTr = db.prepare('INSERT INTO topic_rollups (topic_tag, item_count) VALUES (?, ?)');
    for (const r of trRows) insTr.run(r.topic_tag, Number(r.item_count));

    const paRows = parseCSV(fs.readFileSync(path.join(DATA_DIR, 'pipeline_run_audit.csv'), 'utf8'));
    db.exec('DELETE FROM pipeline_run_audit;');
    const insPa = db.prepare(`
      INSERT INTO pipeline_run_audit (
        run_timestamp, notebook_statuses, notebook_durations,
        raw_before, raw_after, silver_deduped_before, silver_deduped_after,
        silver_clean_before, silver_clean_after, silver_tagged_before, silver_tagged_after,
        gold_before, gold_after, duplicate_item_id_count, missing_published_at_count, final_GO_NO_GO_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of paRows) {
      insPa.run(
        r.run_timestamp,
        r.notebook_statuses,
        r.notebook_durations,
        Number(r.raw_before),
        Number(r.raw_after),
        Number(r.silver_deduped_before),
        Number(r.silver_deduped_after),
        Number(r.silver_clean_before),
        Number(r.silver_clean_after),
        Number(r.silver_tagged_before),
        Number(r.silver_tagged_after),
        Number(r.gold_before),
        Number(r.gold_after),
        Number(r.duplicate_item_id_count),
        Number(r.missing_published_at_count),
        r.final_GO_NO_GO_status
      );
    }

    db.exec('COMMIT;');
    console.log('SQLite database seeded successfully.');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error seeding SQLite database:', err);
    throw err;
  }

  return db;
}
