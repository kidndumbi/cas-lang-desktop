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
        for attempt in 0..30 {
            std::thread::sleep(std::time::Duration::from_millis(200 * (attempt + 1)));
            if let Ok(db) = sled::open(&path) {
                return Ok(Self { db });
            }
        }
        // Lock still held after ~90s — try removing just the lock file, not the data
        eprintln!("Lock still held after retries. Removing lock file only...");
        let lock_path = path.join("__sled_lock");
        let _ = std::fs::remove_file(&lock_path);
        // Also try removing the default db lock if it exists
        let default_lock = path.join("default").join("__sled_lock");
        let _ = std::fs::remove_file(&default_lock);
        if let Ok(db) = sled::open(&path) {
            return Ok(Self { db });
        }
        // Absolute last resort: keep retrying, but NEVER delete user data
        eprintln!("CRITICAL: Cannot open DB. Restart the app or check disk.");
        Err(sled::Error::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Database locked and cannot be recovered. Please restart the application.",
        )))
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