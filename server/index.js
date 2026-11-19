import express from 'express';
import cors from 'cors';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initDatabase, BRIEF_PLACEHOLDER_HIGHLIGHTS } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Optional password gate. Only active when SITE_PASSWORD is set (set in Render, not locally).
const SITE_PASSWORD = process.env.SITE_PASSWORD || '';
const AUTH_COOKIE = 'hub_auth';
const AUTH_TOKEN = SITE_PASSWORD
  ? crypto.createHmac('sha256', SITE_PASSWORD).update('intelligence-hub-auth').digest('hex')
  : '';

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function isAuthenticated(req) {
  if (!SITE_PASSWORD) return true;
  const token = readCookie(req, AUTH_COOKIE);
  return Boolean(token) && safeEqual(token, AUTH_TOKEN);
}

app.get('/api/auth/status', (req, res) => {
  res.json({ required: Boolean(SITE_PASSWORD), authenticated: isAuthenticated(req) });
});

app.post('/api/auth/login', (req, res) => {
  if (!SITE_PASSWORD) return res.json({ ok: true });
  const submitted = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!safeEqual(submitted, SITE_PASSWORD)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `${AUTH_COOKIE}=${AUTH_TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`
  );
  res.json({ ok: true });
});

app.use((req, res, next) => {
  if (isAuthenticated(req)) return next();
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/auth/')) {
    return res.status(401).json({ error: 'Password required' });
  }
  next();
});

const db = initDatabase(false);

// Helper to build WHERE clause for intelligence_items
function buildItemFilters(query) {
  const clauses = [];
  const params = [];

  if (query.jurisdiction && query.jurisdiction !== 'All') {
    const list = String(query.jurisdiction)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 1) {
      clauses.push('jurisdiction = ?');
      params.push(list[0]);
    } else if (list.length > 1) {
      clauses.push(`jurisdiction IN (${list.map(() => '?').join(',')})`);
      params.push(...list);
    }
  }

  if (query.startDate) {
    clauses.push('(published_date IS NOT NULL AND published_date >= ?)');
    params.push(String(query.startDate));
  }

  if (query.endDate) {
    clauses.push('(published_date IS NOT NULL AND published_date <= ?)');
    params.push(String(query.endDate));
  }

  if (query.contentSection && query.contentSection !== 'All') {
    clauses.push('content_section = ?');
    params.push(String(query.contentSection));
  }

  if (query.topicTag && query.topicTag !== 'All') {
    clauses.push('topic_tag = ?');
    params.push(String(query.topicTag));
  }

  if (query.sourceGroup && query.sourceGroup !== 'All') {
    clauses.push('display_source_group = ?');
    params.push(String(query.sourceGroup));
  }

  if (query.feedback === 'liked') {
    clauses.push('user_vote = 1');
  } else if (query.feedback === 'disliked') {
    clauses.push('user_vote = -1');
  } else if (query.feedback === 'bookmarked') {
    clauses.push('is_bookmarked = 1');
  }

  if (query.search && String(query.search).trim() !== '') {
    const term = `%${String(query.search).trim()}%`;
    clauses.push(
      '(title LIKE ? OR summary LIKE ? OR source_name LIKE ? OR topic_tag LIKE ? OR jurisdiction LIKE ? OR people_entities LIKE ?)'
    );
    params.push(term, term, term, term, term, term);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { whereSql, params };
}

// GET /api/meta
app.get('/api/meta', (req, res) => {
  try {
    const dateBounds = db
      .prepare(
        'SELECT MIN(published_date) as min_date, MAX(published_date) as max_date, COUNT(*) as total_items FROM intelligence_items'
      )
      .get();

    const jurisdictions = db
      .prepare(
        'SELECT jurisdiction, MIN(jurisdiction_sort_order) as sort_order, COUNT(*) as count FROM intelligence_items GROUP BY jurisdiction ORDER BY sort_order ASC, count DESC'
      )
      .all();

    const contentSections = db
      .prepare('SELECT content_section, COUNT(*) as count FROM intelligence_items GROUP BY content_section ORDER BY count DESC')
      .all();

    const topicTags = db
      .prepare("SELECT topic_tag, COUNT(*) as count FROM intelligence_items WHERE topic_tag != '' GROUP BY topic_tag ORDER BY count DESC")
      .all();

    const sourceGroups = db
      .prepare(
        'SELECT display_source_group, COUNT(*) as count FROM intelligence_items GROUP BY display_source_group ORDER BY count DESC'
      )
      .all();

    const audit = db.prepare('SELECT * FROM pipeline_run_audit LIMIT 1').get();

    const feedbackCounts = db
      .prepare(
        `SELECT
          SUM(CASE WHEN user_vote = 1 THEN 1 ELSE 0 END) as liked,
          SUM(CASE WHEN user_vote = -1 THEN 1 ELSE 0 END) as disliked,
          SUM(CASE WHEN is_bookmarked = 1 THEN 1 ELSE 0 END) as bookmarked
        FROM intelligence_items`
      )
      .get();

    res.json({
      minDate: dateBounds.min_date,
      maxDate: dateBounds.max_date,
      totalItems: dateBounds.total_items,
      jurisdictions,
      contentSections,
      topicTags,
      sourceGroups,
      audit,
      feedbackCounts,
    });
  } catch (err) {
    console.error('Error in /api/meta:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/news-grouped
app.get('/api/news-grouped', (req, res) => {
  try {
    const { whereSql, params } = buildItemFilters(req.query);
    const limitPerSection = Math.min(Number(req.query.limitPerSection) || 150, 500);

    const sections = [
      'Government Announcements',
      'Health Care Funding',
      'Health Ministers News',
      'Articles and Research Reports',
    ];

    const grouped = {};
    const counts = {};
    let totalMatched = 0;

    for (const sec of sections) {
      const secWhere = whereSql ? `${whereSql} AND content_section = ?` : 'WHERE content_section = ?';
      const secParams = [...params, sec];

      const cntRow = db
        .prepare(`SELECT COUNT(*) as c FROM intelligence_items ${secWhere}`)
        .get(...secParams);
      counts[sec] = cntRow.c;
      totalMatched += cntRow.c;

      const items = db
        .prepare(
          `SELECT * FROM intelligence_items ${secWhere}
           ORDER BY CASE WHEN published_at IS NULL OR published_at = '' THEN 1 ELSE 0 END,
                    published_at DESC, ingested_at DESC
           LIMIT ?`
        )
        .all(...secParams, limitPerSection);

      grouped[sec] = items;
    }

    const unifiedLimit = Math.min(Number(req.query.unifiedLimit) || 1500, 1500);
    const unifiedItems = db
      .prepare(
        `SELECT * FROM intelligence_items ${whereSql}
         ORDER BY CASE WHEN published_at IS NULL OR published_at = '' THEN 1 ELSE 0 END,
                  published_at DESC, ingested_at DESC
         LIMIT ?`
      )
      .all(...params, unifiedLimit);

    res.json({
      sections: grouped,
      unifiedItems,
      counts,
      totalMatched,
    });
  } catch (err) {
    console.error('Error in /api/news-grouped:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/items (for Archive table & drill-downs)
app.get('/api/items', (req, res) => {
  try {
    const { whereSql, params } = buildItemFilters(req.query);
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(10, Number(req.query.pageSize) || 25));
    const offset = (page - 1) * pageSize;

    const allowedSorts = {
      published_at: 'published_at',
      published_date: 'published_date',
      jurisdiction: 'jurisdiction',
      content_section: 'content_section',
      topic_tag: 'topic_tag',
      source_name: 'source_name',
      title: 'title',
    };
    const sortCol = allowedSorts[req.query.sortBy] || 'published_at';
    const sortDir = String(req.query.sortDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const total = db
      .prepare(`SELECT COUNT(*) as c FROM intelligence_items ${whereSql}`)
      .get(...params).c;

    const items = db
      .prepare(
        `SELECT * FROM intelligence_items ${whereSql}
         ORDER BY CASE WHEN ${sortCol} IS NULL OR ${sortCol} = '' THEN 1 ELSE 0 END,
                  ${sortCol} ${sortDir}, ingested_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset);

    res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('Error in /api/items:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/news-stats
app.get('/api/news-stats', (req, res) => {
  try {
    const { whereSql, params } = buildItemFilters(req.query);

    const unfilteredTotal = db.prepare('SELECT COUNT(*) as c FROM intelligence_items').get().c;

    const kpis = db
      .prepare(
        `SELECT
          COUNT(*) as total_items,
          SUM(CASE WHEN is_government_source = 1 THEN 1 ELSE 0 END) as gov_source_count,
          SUM(CASE WHEN is_funding_related = 1 THEN 1 ELSE 0 END) as funding_related_count,
          SUM(CASE WHEN is_minister_related = 1 THEN 1 ELSE 0 END) as minister_related_count,
          SUM(CASE WHEN is_research_or_media = 1 THEN 1 ELSE 0 END) as research_media_count,
          SUM(CASE WHEN user_vote = 1 THEN 1 ELSE 0 END) as liked_count,
          SUM(CASE WHEN is_bookmarked = 1 THEN 1 ELSE 0 END) as bookmarked_count,
          COUNT(DISTINCT jurisdiction) as active_jurisdictions,
          COUNT(DISTINCT source_name) as active_sources
        FROM intelligence_items ${whereSql}`
      )
      .get(...params);

    const byContentSection = db
      .prepare(
        `SELECT content_section, COUNT(*) as item_count
         FROM intelligence_items ${whereSql}
         GROUP BY content_section
         ORDER BY item_count DESC`
      )
      .all(...params);

    const byTopicTag = db
      .prepare(
        `SELECT CASE WHEN topic_tag IS NULL OR topic_tag = '' THEN 'Unspecified' ELSE topic_tag END as topic_tag,
                COUNT(*) as item_count
         FROM intelligence_items ${whereSql}
         GROUP BY 1
         ORDER BY item_count DESC`
      )
      .all(...params);

    const bySourceGroup = db
      .prepare(
        `SELECT display_source_group, COUNT(*) as item_count
         FROM intelligence_items ${whereSql}
         GROUP BY display_source_group
         ORDER BY item_count DESC`
      )
      .all(...params);

    const byJurisdiction = db
      .prepare(
        `SELECT jurisdiction, MIN(jurisdiction_sort_order) as sort_order, COUNT(*) as item_count
         FROM intelligence_items ${whereSql}
         GROUP BY jurisdiction
         ORDER BY item_count DESC, sort_order ASC`
      )
      .all(...params);

    const timelineWhere = whereSql
      ? `${whereSql} AND published_date IS NOT NULL AND published_date != ''`
      : `WHERE published_date IS NOT NULL AND published_date != ''`;

    const byMonth = db
      .prepare(
        `SELECT substr(published_date, 1, 7) as year_month, COUNT(*) as item_count
         FROM intelligence_items ${timelineWhere}
         GROUP BY year_month
         ORDER BY year_month ASC`
      )
      .all(...params);

    const audit = db.prepare('SELECT * FROM pipeline_run_audit LIMIT 1').get();

    res.json({
      unfilteredTotal,
      kpis,
      byContentSection,
      byTopicTag,
      bySourceGroup,
      byJurisdiction,
      byMonth,
      audit,
    });
  } catch (err) {
    console.error('Error in /api/news-stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items/:id/feedback
app.post('/api/items/:id/feedback', (req, res) => {
  try {
    const { id } = req.params;
    const { vote, bookmarked, notes } = req.body;

    const existing = db.prepare('SELECT * FROM intelligence_items WHERE item_id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const newVote = vote !== undefined ? Number(vote) : existing.user_vote;
    const newBookmarked = bookmarked !== undefined ? (bookmarked ? 1 : 0) : existing.is_bookmarked;
    const newNotes = notes !== undefined ? String(notes) : existing.user_notes;

    db.prepare(
      'UPDATE intelligence_items SET user_vote = ?, is_bookmarked = ?, user_notes = ? WHERE item_id = ?'
    ).run(newVote, newBookmarked, newNotes, id);

    const updated = db.prepare('SELECT * FROM intelligence_items WHERE item_id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Error in /api/items/:id/feedback:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items (add manual intelligence brief)
app.post('/api/items', (req, res) => {
  try {
    const {
      title,
      summary,
      jurisdiction = 'Federal',
      content_section = 'Government Announcements',
      topic_tag = 'Ministerial Announcement',
      source_name = 'Manual Analyst Entry',
      source_url = '',
      published_date,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const item_id = crypto.randomBytes(16).toString('hex');
    const nowIso = new Date().toISOString();
    const pubDate = published_date || nowIso.slice(0, 10);
    const pubAt = `${pubDate} 12:00:00+00:00`;

    db.prepare(
      `INSERT INTO intelligence_items (
        item_id, title, summary, published_at, published_date, source_name, source_type,
        jurisdiction, topic_tag, people_entities, source_url, ingested_at,
        is_manual_item, is_health_related, is_funding_related, is_government_source,
        is_minister_related, is_research_or_media, is_operational_advisory,
        content_section, display_source_group, jurisdiction_sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?, '', ?, ?, 1, 1, ?, 1, ?, 0, 0, ?, 'Government Newsroom', 1)`
    ).run(
      item_id,
      String(title).trim(),
      String(summary || '').trim(),
      pubAt,
      pubDate,
      String(source_name).trim(),
      jurisdiction,
      topic_tag,
      String(source_url).trim(),
      nowIso,
      content_section === 'Health Care Funding' || topic_tag === 'Federal Funding' ? 1 : 0,
      content_section === 'Health Ministers News' || topic_tag === 'Ministerial Announcement' ? 1 : 0,
      content_section
    );

    const created = db.prepare('SELECT * FROM intelligence_items WHERE item_id = ?').get(item_id);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error in POST /api/items:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funding
app.get('/api/funding', (req, res) => {
  try {
    const {
      jurisdiction = 'All',
      year = 'All',
      sexGroup = 'Both sexes',
      serviceCategory = 'total_health',
      metricType = 'total_expenditure',
    } = req.query;

    const selectedJurisdictions =
      jurisdiction && jurisdiction !== 'All'
        ? String(jurisdiction)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const selectedYears =
      year && year !== 'All'
        ? String(year)
            .split(',')
            .map((y) => Number(y.trim()))
            .filter(Number.isFinite)
        : [];

    // 1. Dashboard time-series (2022-2025)
    let dashWhere = [];
    let dashParams = [];
    if (selectedJurisdictions.length > 0) {
      dashWhere.push(`jurisdiction IN (${selectedJurisdictions.map(() => '?').join(',')})`);
      dashParams.push(...selectedJurisdictions);
    }
    if (selectedYears.length > 0) {
      dashWhere.push(`year IN (${selectedYears.map(() => '?').join(',')})`);
      dashParams.push(...selectedYears);
    }
    const dashSql = `SELECT * FROM funding_dashboard ${
      dashWhere.length ? 'WHERE ' + dashWhere.join(' AND ') : ''
    } ORDER BY year ASC, jurisdiction ASC`;
    const dashboardRows = db.prepare(dashSql).all(...dashParams);

    // Also get all years for time-series charts even when a single year is clicked, or filtered by jurisdiction
    let tsWhere = [];
    let tsParams = [];
    if (selectedJurisdictions.length > 0) {
      tsWhere.push(`jurisdiction IN (${selectedJurisdictions.map(() => '?').join(',')})`);
      tsParams.push(...selectedJurisdictions);
    }
    const timeSeriesRows = db
      .prepare(
        `SELECT * FROM funding_dashboard ${
          tsWhere.length ? 'WHERE ' + tsWhere.join(' AND ') : ''
        } ORDER BY year ASC, jurisdiction ASC`
      )
      .all(...tsParams);

    // 2. Category breakdown (hospitals, physicians, drugs, etc.)
    // Use latest selected year or 2025 by default
    const targetCategoryYear = selectedYears.length > 0 ? Math.max(...selectedYears) : 2025;
    let catWhere = ['year = ?'];
    let catParams = [targetCategoryYear];
    const catJurisdictions = selectedJurisdictions.filter((j) => j !== 'Canada');
    if (catJurisdictions.length > 0) {
      catWhere.push(`jurisdiction IN (${catJurisdictions.map(() => '?').join(',')})`);
      catParams.push(...catJurisdictions);
    }
    const categoryRows = db
      .prepare(
        `SELECT * FROM funding_category WHERE ${catWhere.join(' AND ')} ORDER BY sub_total DESC`
      )
      .all(...catParams);

    // 3. Age & Sex Expenditure (available for 2022 and 2023; use latest matching or 2023)
    const availableAgeYears = [2022, 2023];
    const matchingAgeYears = selectedYears.filter((y) => availableAgeYears.includes(y));
    const targetAgeYear = matchingAgeYears.length > 0 ? Math.max(...matchingAgeYears) : 2023;

    let ageWhere = [
      'year = ?',
      'sex_group = ?',
      'service_category = ?',
      'metric_type = ?',
      "age_group != 'Total'",
    ];
    let ageParams = [targetAgeYear, sexGroup, serviceCategory, metricType];

    if (selectedJurisdictions.length > 0) {
      ageWhere.push(`jurisdiction IN (${selectedJurisdictions.map(() => '?').join(',')})`);
      ageParams.push(...selectedJurisdictions);
    } else {
      // When "All" is selected, use 'Canada' national aggregate so we don't double-count Canada + P/Ts
      // (And we also return the raw PowerBI sum in case user toggles aggregation mode)
      ageWhere.push(`jurisdiction = 'Canada'`);
    }

    const ageOrder = [
      '<1', '1-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39',
      '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79',
      '80-84', '85-89', '90+'
    ];

    const ageRaw = db
      .prepare(
        `SELECT age_group,
                SUM(value) as sum_value,
                AVG(value) as avg_value
         FROM funding_age_sex
         WHERE ${ageWhere.join(' AND ')}
         GROUP BY age_group`
      )
      .all(...ageParams);

    const ageMap = new Map(ageRaw.map((r) => [r.age_group, r]));
    const ageRows = ageOrder
      .filter((ag) => ageMap.has(ag))
      .map((ag) => {
        const r = ageMap.get(ag);
        return {
          age_group: ag,
          value: metricType === 'per_capita_expenditure' ? r.avg_value : r.sum_value,
          sum_value: r.sum_value,
          avg_value: r.avg_value,
        };
      });

    // Also provide sex comparison per age group (Male vs Female) for the same filter
    let sexCompJurisClause = `jurisdiction = 'Canada'`;
    let sexCompParams = [targetAgeYear, serviceCategory, metricType];
    if (selectedJurisdictions.length > 0) {
      sexCompJurisClause = `jurisdiction IN (${selectedJurisdictions.map(() => '?').join(',')})`;
      sexCompParams.push(...selectedJurisdictions);
    }
    const sexComparisonRaw = db
      .prepare(
        `SELECT age_group, sex_group,
                SUM(value) as sum_value,
                AVG(value) as avg_value
         FROM funding_age_sex
         WHERE year = ? AND service_category = ? AND metric_type = ? AND age_group != 'Total'
           AND ${sexCompJurisClause}
         GROUP BY age_group, sex_group`
      )
      .all(...sexCompParams);

    const ageBySexMap = new Map();
    for (const ag of ageOrder) {
      ageBySexMap.set(ag, { age_group: ag });
    }
    for (const r of sexComparisonRaw) {
      const entry = ageBySexMap.get(r.age_group);
      if (entry) {
        const val = metricType === 'per_capita_expenditure' ? r.avg_value : r.sum_value;
        entry[r.sex_group] = val;
      }
    }

    // 4. Snapshot for all jurisdictions in targetCategoryYear
    const allJurisdictionsLatest = db
      .prepare('SELECT * FROM funding_dashboard WHERE year = ? ORDER BY total_expenditure_nominal DESC')
      .all(targetCategoryYear);

    res.json({
      targetYear: targetCategoryYear,
      targetAgeYear,
      dashboardRows,
      timeSeriesRows,
      categoryRows,
      ageRows,
      ageBySexRows: Array.from(ageBySexMap.values()),
      allJurisdictionsLatest,
    });
  } catch (err) {
    console.error('Error in /api/funding:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fixed demo date; swap for the live date when the feed is connected.
const DEMO_TODAY = '2026-10-27';
const WEEK_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const sundayOf = (isoDate) => addDays(isoDate, -new Date(`${isoDate}T00:00:00Z`).getUTCDay());

const HISTORY_START = (() => {
  const d = new Date(`${DEMO_TODAY}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 6);
  return sundayOf(d.toISOString().slice(0, 10));
})();

const formatWeekLabel = (weekStart) =>
  `Week of ${new Date(`${weekStart}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })}`;

const resolveWeekStart = (value) =>
  sundayOf(ISO_DATE.test(String(value ?? '')) ? String(value) : DEMO_TODAY);

const findBriefForWeek = (weekStart) =>
  db
    .prepare('SELECT * FROM weekly_briefs WHERE week_start BETWEEN ? AND ? ORDER BY week_start LIMIT 1')
    .get(weekStart, addDays(weekStart, 6));

// GET /api/brief/week?week=YYYY-MM-DD
app.get('/api/brief/week', (req, res) => {
  try {
    const weekStart = resolveWeekStart(req.query.week);
    const weekEnd = addDays(weekStart, 6);
    const collectedThrough = weekEnd < DEMO_TODAY ? weekEnd : DEMO_TODAY;

    const countByDate = new Map(
      db
        .prepare(
          'SELECT published_date AS date, COUNT(*) AS count FROM intelligence_items WHERE published_date BETWEEN ? AND ? GROUP BY published_date'
        )
        .all(weekStart, weekEnd)
        .map((row) => [row.date, row.count])
    );
    const days = WEEK_DAY_NAMES.map((dayName, i) => {
      const date = addDays(weekStart, i);
      const isFuture = date > DEMO_TODAY;
      return {
        date,
        dayName,
        count: isFuture ? null : (countByDate.get(date) ?? 0),
        isFuture,
        isToday: date === DEMO_TODAY,
      };
    });

    const weeks = [];
    for (let s = sundayOf(DEMO_TODAY); s >= HISTORY_START; s = addDays(s, -7)) {
      weeks.push({ weekStart: s, label: formatWeekLabel(s) });
    }

    const brief = findBriefForWeek(weekStart);
    const storedHighlights = brief
      ? db
          .prepare('SELECT highlight_id, body FROM brief_highlights WHERE brief_id = ? ORDER BY position ASC')
          .all(brief.brief_id)
      : [];
    const notes = brief
      ? db
          .prepare(
            'SELECT note_id, brief_id, author, body, created_at FROM brief_notes WHERE brief_id = ? ORDER BY created_at DESC, note_id DESC'
          )
          .all(brief.brief_id)
      : [];

    res.json({
      today: DEMO_TODAY,
      week: { weekStart, weekEnd, collectedThrough, label: formatWeekLabel(weekStart) },
      weeks,
      days,
      highlights:
        storedHighlights.length > 0
          ? storedHighlights
          : BRIEF_PLACEHOLDER_HIGHLIGHTS.map((body) => ({ highlight_id: null, body })),
      notes,
    });
  } catch (err) {
    console.error('Error in /api/brief/week:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/brief/notes  { week, author, body }
app.post('/api/brief/notes', (req, res) => {
  try {
    const weekStart = resolveWeekStart(req.body?.week);
    const author = String(req.body?.author ?? '').trim();
    const body = String(req.body?.body ?? '').trim();
    if (!author || !body) {
      return res.status(400).json({ error: 'Author and note text are required' });
    }
    const brief =
      findBriefForWeek(weekStart) ??
      { brief_id: Number(db.prepare('INSERT INTO weekly_briefs (week_start) VALUES (?)').run(weekStart).lastInsertRowid) };
    const result = db
      .prepare('INSERT INTO brief_notes (brief_id, author, body, created_at) VALUES (?, ?, ?, ?)')
      .run(brief.brief_id, author, body, new Date().toISOString());
    const note = db
      .prepare('SELECT note_id, brief_id, author, body, created_at FROM brief_notes WHERE note_id = ?')
      .get(Number(result.lastInsertRowid));
    res.status(201).json(note);
  } catch (err) {
    console.error('Error in POST /api/brief/notes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve static assets from /assets
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// In production, serve built Vite client
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get(/^\/(?!api\/|assets\/).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API Server listening on http://localhost:${PORT}`);
});
