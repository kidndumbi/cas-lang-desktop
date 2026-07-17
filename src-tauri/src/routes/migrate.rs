use warp::Filter;
use crate::db::AppDb;

pub fn migrate_routes(db: std::sync::Arc<AppDb>) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let db_filter = warp::any().map(move || db.clone());

    warp::path!("api" / "migrate")
        .and(warp::post())
        .and(warp::body::json::<serde_json::Value>())
        .and(db_filter)
        .and_then(handle_migrate)
}

async fn handle_migrate(
    body: serde_json::Value,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let mut counts = serde_json::Map::new();

    if let Some(arr) = body["vocabulary"].as_array() {
        if let Ok(tree) = db.vocabulary() {
            let mut count = 0;
            for item in arr {
                let id = item["id"].as_str().unwrap_or("").to_string();
                if id.is_empty() {
                    // Skip items without proper ID - they need to be created differently
                    continue;
                }
                let key = format!("vocabulary_{}", id);
                if let Ok(json) = serde_json::to_vec(item) {
                    if let Err(e) = tree.insert(key.as_bytes(), json) {
                        eprintln!("Failed to insert vocabulary item: {}", e);
                    } else {
                        count += 1;
                    }
                }
            }
            counts.insert("vocabularyCount".into(), serde_json::Value::Number(count.into()));
        }
    }

    if let Some(arr) = body["vocabularySessionLogs"].as_array() {
        if let Ok(tree) = db.vocabulary_session_logs() {
            let mut count = 0;
            for item in arr {
                let date = item["date"].as_str().unwrap_or("");
                if date.is_empty() {
                    continue;
                }
                let key = format!("vsession_{}", date);
                if let Ok(json) = serde_json::to_vec(item) {
                    if let Err(e) = tree.insert(key.as_bytes(), json) {
                        eprintln!("Failed to insert vocabulary session log: {}", e);
                    } else {
                        count += 1;
                    }
                }
            }
            counts.insert("vocabularySessionCount".into(), serde_json::Value::Number(count.into()));
        }
    }

    if let Some(arr) = body["exercises"].as_array() {
        if let Ok(tree) = db.exercises() {
            let mut count = 0;
            for item in arr {
                let id = item["id"].as_str().unwrap_or("");
                if id.is_empty() {
                    continue;
                }
                let key = format!("exercise_{}", id);
                if let Ok(json) = serde_json::to_vec(item) {
                    if let Err(e) = tree.insert(key.as_bytes(), json) {
                        eprintln!("Failed to insert exercise: {}", e);
                    } else {
                        count += 1;
                    }
                }
            }
            counts.insert("exerciseCount".into(), serde_json::Value::Number(count.into()));
        }
    }

    if let Some(arr) = body["exerciseSessionLogs"].as_array() {
        if let Ok(tree) = db.exercise_session_logs() {
            let mut count = 0;
            for item in arr {
                let date = item["date"].as_str().unwrap_or("");
                if date.is_empty() {
                    continue;
                }
                let key = format!("esession_{}", date);
                if let Ok(json) = serde_json::to_vec(item) {
                    if let Err(e) = tree.insert(key.as_bytes(), json) {
                        eprintln!("Failed to insert exercise session log: {}", e);
                    } else {
                        count += 1;
                    }
                }
            }
            counts.insert("exerciseSessionCount".into(), serde_json::Value::Number(count.into()));
        }
    }

    if let Some(arr) = body["tags"].as_array() {
        if let Ok(tree) = db.tags() {
            let mut count = 0;
            for item in arr {
                if let Some(tag) = item.as_str() {
                    if let Err(e) = tree.insert(tag.as_bytes(), b"1") {
                        eprintln!("Failed to insert tag: {}", e);
                    } else {
                        count += 1;
                    }
                }
            }
            counts.insert("tagsCount".into(), serde_json::Value::Number(count.into()));
        }
    }

    if let Some(arr) = body["tenses"].as_array() {
        if let Ok(tree) = db.tenses() {
            let mut count = 0;
            for item in arr {
                let id = item["id"].as_str().unwrap_or("");
                if id.is_empty() {
                    continue;
                }
                let key = format!("tense_{}", id);
                if let Ok(json) = serde_json::to_vec(item) {
                    if let Err(e) = tree.insert(key.as_bytes(), json) {
                        eprintln!("Failed to insert tense: {}", e);
                    } else {
                        count += 1;
                    }
                }
            }
            counts.insert("tensesCount".into(), serde_json::Value::Number(count.into()));
        }
    }

    if let Some(arr) = body["exerciseAiConversations"].as_array() {
        if let Ok(tree) = db.exercise_ai_conversations() {
            let mut count = 0;
            for item in arr {
                let exercise_id = item["exerciseId"].as_str().unwrap_or("");
                if exercise_id.is_empty() {
                    continue;
                }
                let key = format!("aiconv_{}", exercise_id);
                if let Ok(json) = serde_json::to_vec(item) {
                    if let Err(e) = tree.insert(key.as_bytes(), json) {
                        eprintln!("Failed to insert AI conversation: {}", e);
                    } else {
                        count += 1;
                    }
                }
            }
            counts.insert("conversationCount".into(), serde_json::Value::Number(count.into()));
        }
    }

    let resp = serde_json::json!({
        "success": true,
        "counts": counts,
    });

    Ok(warp::reply::with_status(
        warp::reply::json(&resp),
        warp::http::StatusCode::OK,
    ))
}