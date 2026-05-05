use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptEntry {
    pub id: i64,
    pub text: String,
    pub raw_text: Option<String>,
    pub engine: String,
    pub mode: String,
    pub language: Option<String>,
    pub timestamp: String,
}

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS transcripts (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            text      TEXT    NOT NULL,
            raw_text  TEXT,
            engine    TEXT    NOT NULL,
            mode      TEXT    NOT NULL DEFAULT 'direct',
            language  TEXT,
            timestamp TEXT    NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts USING fts5(
            text, raw_text,
            content='transcripts',
            content_rowid='id'
        );

        CREATE TRIGGER IF NOT EXISTS transcripts_ai
        AFTER INSERT ON transcripts BEGIN
            INSERT INTO transcripts_fts(rowid, text, raw_text)
            VALUES (new.id, new.text, new.raw_text);
        END;

        CREATE TRIGGER IF NOT EXISTS transcripts_ad
        AFTER DELETE ON transcripts BEGIN
            INSERT INTO transcripts_fts(transcripts_fts, rowid, text, raw_text)
            VALUES('delete', old.id, old.text, old.raw_text);
        END;

        CREATE TRIGGER IF NOT EXISTS transcripts_au
        AFTER UPDATE ON transcripts BEGIN
            INSERT INTO transcripts_fts(transcripts_fts, rowid, text, raw_text)
            VALUES('delete', old.id, old.text, old.raw_text);
            INSERT INTO transcripts_fts(rowid, text, raw_text)
            VALUES (new.id, new.text, new.raw_text);
        END;
    ")
}

pub fn insert_transcript(conn: &Connection, entry: &TranscriptEntry) -> Result<i64> {
    conn.execute(
        "INSERT INTO transcripts (text, raw_text, engine, mode, language, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            entry.text, entry.raw_text, entry.engine,
            entry.mode, entry.language, entry.timestamp
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn get_transcripts(conn: &Connection, limit: usize) -> Result<Vec<TranscriptEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, text, raw_text, engine, mode, language, timestamp
         FROM transcripts ORDER BY id DESC LIMIT ?1"
    )?;
    let rows = stmt.query_map(params![limit as i64], |row| {
        Ok(TranscriptEntry {
            id: row.get(0)?,
            text: row.get(1)?,
            raw_text: row.get(2)?,
            engine: row.get(3)?,
            mode: row.get(4)?,
            language: row.get(5)?,
            timestamp: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn search_transcripts(conn: &Connection, query: &str) -> Result<Vec<TranscriptEntry>> {
    if query.is_empty() {
        return Ok(vec![]);
    }
    // Wrap in double quotes for literal phrase match — prevents FTS5 operator injection
    let safe_query = format!("\"{}\"", query.replace('"', " "));
    let mut stmt = conn.prepare(
        "SELECT t.id, t.text, t.raw_text, t.engine, t.mode, t.language, t.timestamp
         FROM transcripts t
         JOIN transcripts_fts f ON t.id = f.rowid
         WHERE transcripts_fts MATCH ?1
         ORDER BY rank"
    )?;
    let rows = stmt.query_map(params![safe_query], |row| {
        Ok(TranscriptEntry {
            id: row.get(0)?,
            text: row.get(1)?,
            raw_text: row.get(2)?,
            engine: row.get(3)?,
            mode: row.get(4)?,
            language: row.get(5)?,
            timestamp: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn clear_all_transcripts(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        DELETE FROM transcripts;
        DELETE FROM transcripts_fts;
    ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn mem_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_db(&conn).unwrap();
        conn
    }

    #[test]
    fn insert_and_retrieve() {
        let conn = mem_conn();
        let entry = TranscriptEntry {
            id: 0,
            text: "hello world".to_string(),
            raw_text: Some("hello world".to_string()),
            engine: "groq".to_string(),
            mode: "direct".to_string(),
            language: Some("en".to_string()),
            timestamp: "2026-05-04T00:00:00Z".to_string(),
        };
        insert_transcript(&conn, &entry).unwrap();
        let results = get_transcripts(&conn, 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].text, "hello world");
        assert!(results[0].id > 0, "database must assign a real rowid");
        assert_eq!(results[0].language, Some("en".to_string()));
    }

    #[test]
    fn fts_search_finds_matching_text() {
        let conn = mem_conn();
        for (text, ts) in [
            ("the quick brown fox", "2026-05-04T00:00:00Z"),
            ("lazy dog jumps over", "2026-05-04T00:01:00Z"),
        ] {
            insert_transcript(&conn, &TranscriptEntry {
                id: 0,
                text: text.to_string(),
                raw_text: None,
                engine: "groq".to_string(),
                mode: "direct".to_string(),
                language: None,
                timestamp: ts.to_string(),
            }).unwrap();
        }
        let results = search_transcripts(&conn, "fox").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].text, "the quick brown fox");
    }

    #[test]
    fn fts_search_empty_query_returns_empty() {
        let conn = mem_conn();
        let results = search_transcripts(&conn, "").unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn get_transcripts_returns_newest_first() {
        let conn = mem_conn();
        for text in ["first", "second", "third"] {
            insert_transcript(&conn, &TranscriptEntry {
                id: 0,
                text: text.to_string(),
                raw_text: None,
                engine: "groq".to_string(),
                mode: "direct".to_string(),
                language: None,
                timestamp: "2026-05-04T00:00:00Z".to_string(),
            }).unwrap();
        }
        let results = get_transcripts(&conn, 10).unwrap();
        assert_eq!(results[0].text, "third", "most recent entry must be first");
        assert_eq!(results[2].text, "first", "oldest entry must be last");
    }
}
