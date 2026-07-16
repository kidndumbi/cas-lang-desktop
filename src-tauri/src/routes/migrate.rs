use crate::db::AppDb;
use warp::Filter;

pub fn migrate_routes(
    db: std::sync::Arc<AppDb>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    let db_filter = warp::any().map(move || db.clone());
    let migrate = warp::path!("api" / "migrate")
        .and(warp::post())
        .and(warp::body::json::<serde_json::Value>())
        .and(db_filter)
        .and_then(handle_migrate);
    migrate
}

async fn handle_migrate(
    data: serde_json::Value,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let mut vocab_count = 0usize;
    let mut ex_count = 0usize;
    let mut tag_count = 0usize;
    let mut tense_count = 0usize;
    let mut conv_count = 0usize;

    // Migrate vocabulary words — normalize missing IDs
    if let Some(vocab) = data["vocabulary"].as_array() {
        if let Ok(tree) = db.vocabulary() {
            for word_val in vocab {
                let mut word = word_val.clone();
                // Generate ID if missing
                if word["id"].is_null() || word["id"].as_str().map(|s| s.is_empty()).unwrap_or(true) {
                    word["id"] = serde_json::Value::String(AppDb::generate_id());
                }
                if let Some(id) = word["id"].as_str() {
                    if let Ok(json) = serde_json::to_vec(&word) {
                        let _ = tree.insert(id.as_bytes(), json);
                        vocab_count += 1;
                    }
                }
            }
        }
    }

    // Migrate vocabulary logs
    if let Some(logs) = data["vocabularyLogs"].as_object() {
        if let Ok(tree) = db.vocabulary_logs() {
            for (key, val) in logs {
                let logs_key = format!("vocabulary_logs_{}", key);
                if let Ok(json) = serde_json::to_vec(val) {
                    let _ = tree.insert(logs_key.as_bytes(), json);
                }
            }
        }
    }

    // Migrate vocabulary session logs
    if let Some(sessions) = data["vocabularySessionLogs"].as_array() {
        if let Ok(tree) = db.vocabulary_session_logs() {
            for session in sessions {
                if let Some(date) = session["date"].as_str() {
                    if let Ok(json) = serde_json::to_vec(session) {
                        let _ = tree.insert(date.as_bytes(), json);
                    }
                }
            }
        }
    }

    // Migrate exercises — normalize missing IDs
    if let Some(exercises) = data["exercises"].as_array() {
        if let Ok(tree) = db.exercises() {
            for ex_val in exercises {
                let mut ex = ex_val.clone();
                if ex["id"].is_null() || ex["id"].as_str().map(|s| s.is_empty()).unwrap_or(true) {
                    ex["id"] = serde_json::Value::String(AppDb::generate_id());
                }
                if let Some(id) = ex["id"].as_str() {
                    if let Ok(json) = serde_json::to_vec(&ex) {
                        let _ = tree.insert(id.as_bytes(), json);
                        ex_count += 1;
                    }
                }
            }
        }
    }

    // Migrate exercise logs
    if let Some(logs) = data["exerciseLogs"].as_object() {
        if let Ok(tree) = db.exercise_logs() {
            for (key, val) in logs {
                let logs_key = format!("exercise_logs_{}", key);
                if let Ok(json) = serde_json::to_vec(val) {
                    let _ = tree.insert(logs_key.as_bytes(), json);
                }
            }
        }
    }

    // Migrate exercise session logs
    if let Some(sessions) = data["exerciseSessionLogs"].as_array() {
        if let Ok(tree) = db.exercise_session_logs() {
            for session in sessions {
                if let Some(date) = session["date"].as_str() {
                    if let Ok(json) = serde_json::to_vec(session) {
                        let _ = tree.insert(date.as_bytes(), json);
                    }
                }
            }
        }
    }

    // Migrate tags
    if let Some(tags) = data["tags"].as_array() {
        if let Ok(tree) = db.tags() {
            for tag in tags {
                if let Some(t) = tag.as_str() {
                    let _ = tree.insert(t.as_bytes(), b"1");
                    tag_count += 1;
                }
            }
        }
    }

    // Migrate tenses (array of [key, value] arrays)
    if let Some(tenses) = data["tenses"].as_array() {
        if let Ok(tree) = db.tenses() {
            for pair in tenses {
                if let Some(arr) = pair.as_array() {
                    if let (Some(key), Some(val)) = (arr.first(), arr.get(1)) {
                        if let Some(k) = key.as_str() {
                            if let Ok(json) = serde_json::to_vec(val) {
                                let _ = tree.insert(k.as_bytes(), json);
                                tense_count += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    // Migrate exercise AI conversations
    if let Some(conversations) = data["exerciseAiConversations"].as_array() {
        if let Ok(tree) = db.exercise_ai_conversations() {
            for conv in conversations {
                if let Some(ex_id) = conv["exerciseId"].as_str() {
                    if let Ok(json) = serde_json::to_vec(conv) {
                        let _ = tree.insert(ex_id.as_bytes(), json);
                        conv_count += 1;
                    }
                }
            }
        }
    }

    let resp = serde_json::json!({
        "success": true,
        "vocabularyCount": vocab_count,
        "exerciseCount": ex_count,
        "tagsCount": tag_count,
        "tensesCount": tense_count,
        "conversationCount": conv_count,
    });
    Ok(warp::reply::with_status(warp::reply::json(&resp), warp::http::StatusCode::OK))
}