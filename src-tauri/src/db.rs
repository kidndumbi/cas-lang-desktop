use sled::{Db, Tree};
use std::path::PathBuf;

pub struct AppDb {
    db: Db,
}

impl AppDb {
    pub fn open(path: PathBuf) -> Result<Self, sled::Error> {
        // Try normal open first
        if let Ok(db) = sled::open(&path) {
            return Ok(Self { db });
        }
        // Stale lock from crashed/killed process — retry with escalating backoff
        eprintln!("DB open failed (stale lock). Waiting for OS to release...");
        for attempt in 0..15 {
            std::thread::sleep(std::time::Duration::from_millis(400 * (attempt + 1)));
            if let Ok(db) = sled::open(&path) {
                return Ok(Self { db });
            }
        }
        // Last resort: delete the locked directory and start fresh
        eprintln!("Still locked after retries. Deleting stale DB directory...");
        let _ = std::fs::remove_dir_all(&path);
        sled::open(path).map(|db| Self { db })
    }

    pub fn vocabulary(&self) -> Result<Tree, sled::Error> {
        self.db.open_tree("vocabulary")
    }

    pub fn vocabulary_logs(&self) -> Result<Tree, sled::Error> {
        self.db.open_tree("vocabulary_logs")
    }

    pub fn vocabulary_session_logs(&self) -> Result<Tree, sled::Error> {
        self.db.open_tree("vocabulary_session_logs")
    }

    pub fn exercises(&self) -> Result<Tree, sled::Error> {
        self.db.open_tree("exercises")
    }

    pub fn exercise_logs(&self) -> Result<Tree, sled::Error> {
        self.db.open_tree("exercise_logs")
    }

    pub fn exercise_session_logs(&self) -> Result<Tree, sled::Error> {
        self.db.open_tree("exercise_session_logs")
    }

    pub fn tags(&self) -> Result<Tree, sled::Error> {
        self.db.open_tree("tags")
    }

    pub fn tenses(&self) -> Result<Tree, sled::Error> {
        self.db.open_tree("tenses")
    }

    pub fn exercise_ai_conversations(&self) -> Result<Tree, sled::Error> {
        self.db.open_tree("exercise_ai_conversations")
    }

    pub fn generate_id() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    /// Get current timestamp in milliseconds
    pub fn now_ms() -> i64 {
        chrono::Utc::now().timestamp_millis()
    }
}