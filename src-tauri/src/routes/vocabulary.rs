use crate::db::AppDb;
use crate::models::*;
use serde_json::Value;
use std::collections::HashMap;
use warp::Filter;

pub fn vocabulary_routes(
    db: std::sync::Arc<AppDb>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    let db_filter = warp::any().map(move || db.clone());

    // GET /api/vocabulary
    let get_all = warp::path!("api" / "vocabulary")
        .and(warp::get())
        .and(warp::query::<HashMap<String, String>>())
        .and(db_filter.clone())
        .and_then(handle_get_all_vocabulary);

    // POST /api/vocabulary
    let create = warp::path!("api" / "vocabulary")
        .and(warp::post())
        .and(warp::body::json::<CreateVocabularyWord>())
        .and(db_filter.clone())
        .and_then(handle_create_vocabulary);

    // PUT /api/vocabulary/:id
    let update = warp::path!("api" / "vocabulary" / String)
        .and(warp::put())
        .and(warp::body::json::<UpdateVocabularyWord>())
        .and(db_filter.clone())
        .and_then(handle_update_vocabulary);

    // PATCH /api/vocabulary/:id/stats
    let update_stats = warp::path!("api" / "vocabulary" / String / "stats")
        .and(warp::patch())
        .and(warp::body::json::<UpdateVocabularyStatsRequest>())
        .and(db_filter.clone())
        .and_then(handle_update_vocabulary_stats);

    // DELETE /api/vocabulary/:id
    let delete = warp::path!("api" / "vocabulary" / String)
        .and(warp::delete())
        .and(db_filter.clone())
        .and_then(handle_delete_vocabulary);

    // GET /api/vocabulary/:id/logs
    let get_logs = warp::path!("api" / "vocabulary" / String / "logs")
        .and(warp::get())
        .and(db_filter.clone())
        .and_then(handle_get_vocabulary_logs);

    // GET /api/vocabulary/session-logs (must be before :id to avoid conflict)
    let get_session_logs = warp::path!("api" / "vocabulary" / "session-logs")
        .and(warp::get())
        .and(db_filter.clone())
        .and_then(handle_get_vocabulary_session_logs);

    get_all
        .or(create)
        .or(update_stats)
        .or(update)
        .or(delete)
        .or(get_session_logs)
        .or(get_logs)
}

async fn handle_get_all_vocabulary(
    query: HashMap<String, String>,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.vocabulary() {
        Ok(tree) => {
            let mut words: Vec<VocabularyWord> = tree
                .iter()
                .filter_map(|r| r.ok())
                .filter_map(|(_, v)| serde_json::from_slice::<VocabularyWord>(&v).ok())
                .collect();

            if let Some(pl) = query.get("practiceLanguage") {
                words.retain(|w| w.practice_language == *pl);
            }
            if let Some(nl) = query.get("nativeLanguage") {
                words.retain(|w| w.native_language == *nl);
            }

            let resp = ApiResponse::success(words);
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::OK,
            ))
        }
        Err(e) => {
            let resp = ApiResponse::<Value>::error(&format!("DB error: {}", e));
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

async fn handle_create_vocabulary(
    data: CreateVocabularyWord,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let id = AppDb::generate_id();
    let now = AppDb::now_ms();

    let word = VocabularyWord {
        id: id.clone(),
        word: data.word,
        translation: data.translation,
        practice_language: data.practice_language,
        native_language: data.native_language,
        difficulty: data.difficulty,
        tags: data.tags,
        practice_count: 0,
        correct_count: 0,
        accuracy_rate: 0.0,
        mc_total: 0,
        mc_correct: 0,
        sw_total: 0,
        sw_correct: 0,
        tw_total: 0,
        tw_correct: 0,
        parent_verb_id: data.parent_verb_id,
        tenses_id: None,
        notes: data.notes,
        created_at: now,
        last_practiced: None,
    };

    match db.vocabulary() {
        Ok(tree) => {
            let json = serde_json::to_vec(&word).unwrap();
            match tree.insert(id.as_bytes(), json) {
                Ok(_) => {
                    let resp = ApiResponse::success(word);
                    Ok(warp::reply::with_status(
                        warp::reply::json(&resp),
                        warp::http::StatusCode::CREATED,
                    ))
                }
                Err(e) => {
                    let resp = ApiResponse::<Value>::error(&format!("DB insert error: {}", e));
                    Ok(warp::reply::with_status(
                        warp::reply::json(&resp),
                        warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                    ))
                }
            }
        }
        Err(e) => {
            let resp = ApiResponse::<Value>::error(&format!("DB error: {}", e));
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

async fn handle_update_vocabulary(
    id: String,
    data: UpdateVocabularyWord,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.vocabulary() {
        Ok(tree) => match tree.get(id.as_bytes()) {
            Ok(Some(existing)) => {
                let mut word: VocabularyWord = serde_json::from_slice(&existing).unwrap();
                let before = serde_json::to_value(&word).unwrap();

                if let Some(w) = data.word { word.word = w; }
                if let Some(t) = data.translation { word.translation = t; }
                if let Some(pl) = data.practice_language { word.practice_language = pl; }
                if let Some(nl) = data.native_language { word.native_language = nl; }
                if let Some(d) = data.difficulty { word.difficulty = Some(d); }
                if let Some(tags) = data.tags { word.tags = tags; }
                if let Some(pv) = data.parent_verb_id { word.parent_verb_id = Some(pv); }
                if let Some(ti) = data.tenses_id { word.tenses_id = Some(ti); }
                if let Some(n) = data.notes { word.notes = Some(n); }

                let after = serde_json::to_value(&word).unwrap();

                let json = serde_json::to_vec(&word).unwrap();
                let _ = tree.insert(id.as_bytes(), json);

                log_vocabulary_update(&db, &id, &before, &after);

                let resp = ApiResponse::success(word);
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::OK,
                ))
            }
            Ok(None) => {
                let resp = ApiResponse::<Value>::error("Vocabulary word not found");
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::NOT_FOUND,
                ))
            }
            Err(e) => {
                let resp = ApiResponse::<Value>::error(&format!("DB error: {}", e));
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                ))
            }
        },
        Err(e) => {
            let resp = ApiResponse::<Value>::error(&format!("DB error: {}", e));
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

async fn handle_update_vocabulary_stats(
    id: String,
    data: UpdateVocabularyStatsRequest,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.vocabulary() {
        Ok(tree) => match tree.get(id.as_bytes()) {
            Ok(Some(existing)) => {
                let mut word: VocabularyWord = serde_json::from_slice(&existing).unwrap();

                word.practice_count += 1;
                if data.correct {
                    word.correct_count += 1;
                }
                word.accuracy_rate = if word.practice_count > 0 {
                    (word.correct_count as f64 / word.practice_count as f64) * 100.0
                } else {
                    0.0
                };
                word.last_practiced = Some(AppDb::now_ms());

                let ex_type = data.exercise_type.as_deref().unwrap_or("multiple-choice");
                match ex_type {
                    "multiple-choice" => {
                        word.mc_total += 1;
                        if data.correct { word.mc_correct += 1; }
                    }
                    "spell-word" => {
                        word.sw_total += 1;
                        if data.correct { word.sw_correct += 1; }
                    }
                    "type-word" => {
                        word.tw_total += 1;
                        if data.correct { word.tw_correct += 1; }
                    }
                    "spell-verb-tense" | "spellVerbTense" => {}
                    "choose-verb-tense" | "chooseVerbTense" => {}
                    _ => {}
                }

                let json = serde_json::to_vec(&word).unwrap();
                let _ = tree.insert(id.as_bytes(), json);

                log_vocabulary_practice(&db, &id, data.correct);
                log_vocabulary_practice_session(&db, &id, data.correct, ex_type);

                let resp = EmptyResponse::success();
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::OK,
                ))
            }
            Ok(None) => {
                let resp = EmptyResponse::error("Vocabulary word not found");
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::NOT_FOUND,
                ))
            }
            Err(e) => {
                let resp = EmptyResponse::error(&format!("DB error: {}", e));
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                ))
            }
        },
        Err(e) => {
            let resp = EmptyResponse::error(&format!("DB error: {}", e));
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

async fn handle_delete_vocabulary(
    id: String,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.vocabulary() {
        Ok(tree) => {
            let _ = tree.remove(id.as_bytes());
        }
        Err(e) => {
            let resp = EmptyResponse::error(&format!("DB error: {}", e));
            return Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ));
        }
    }

    delete_vocabulary_logs(&db, &id);

    let resp = EmptyResponse::success();
    Ok(warp::reply::with_status(
        warp::reply::json(&resp),
        warp::http::StatusCode::OK,
    ))
}

async fn handle_get_vocabulary_logs(
    id: String,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.vocabulary_logs() {
        Ok(tree) => {
            let logs_key = format!("vocabulary_logs_{}", id);
            match tree.get(logs_key.as_bytes()) {
                Ok(Some(data)) => {
                    let logs: VocabularyLogs = serde_json::from_slice(&data).unwrap_or(VocabularyLogs {
                        word_id: id,
                        entries: vec![],
                    });
                    let resp = ApiResponse::success(logs);
                    Ok(warp::reply::with_status(
                        warp::reply::json(&resp),
                        warp::http::StatusCode::OK,
                    ))
                }
                _ => {
                    let resp = ApiResponse::success(VocabularyLogs {
                        word_id: id,
                        entries: vec![],
                    });
                    Ok(warp::reply::with_status(
                        warp::reply::json(&resp),
                        warp::http::StatusCode::OK,
                    ))
                }
            }
        }
        Err(e) => {
            let resp = ApiResponse::<Value>::error(&format!("DB error: {}", e));
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

async fn handle_get_vocabulary_session_logs(
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.vocabulary_session_logs() {
        Ok(tree) => {
            let logs: Vec<VocabularySessionLog> = tree
                .iter()
                .filter_map(|r| r.ok())
                .filter_map(|(_, v)| serde_json::from_slice::<VocabularySessionLog>(&v).ok())
                .collect();
            let resp = ApiResponse::success(logs);
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::OK,
            ))
        }
        Err(e) => {
            let resp = ApiResponse::<Value>::error(&format!("DB error: {}", e));
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

// ─── Logging helpers ────────────────────────────────────────────────────

fn log_vocabulary_update(db: &AppDb, word_id: &str, before: &Value, after: &Value) {
    if let Ok(tree) = db.vocabulary_logs() {
        let logs_key = format!("vocabulary_logs_{}", word_id);

        let mut logs = match tree.get(logs_key.as_bytes()) {
            Ok(Some(data)) => {
                serde_json::from_slice::<VocabularyLogs>(&data).unwrap_or(VocabularyLogs {
                    word_id: word_id.to_string(),
                    entries: vec![],
                })
            }
            _ => VocabularyLogs {
                word_id: word_id.to_string(),
                entries: vec![],
            },
        };

        let changed_fields: Vec<String> = if let (Value::Object(before_map), Value::Object(after_map)) = (before, after) {
            before_map.iter()
                .filter_map(|(k, v)| {
                    if after_map.get(k) != Some(v) {
                        Some(k.clone())
                    } else {
                        None
                    }
                })
                .collect()
        } else {
            vec![]
        };

        let entry = VocabularyLogEntry {
            id: AppDb::generate_id(),
            word_id: word_id.to_string(),
            timestamp: AppDb::now_ms(),
            log_type: "word-update".to_string(),
            practice_details: None,
            update_details: Some(serde_json::json!({
                "changedFields": changed_fields,
                "before": before,
                "after": after,
            })),
        };

        logs.entries.push(entry);
        if let Ok(json) = serde_json::to_vec(&logs) {
            let _ = tree.insert(logs_key.as_bytes(), json);
        }
    }
}

fn log_vocabulary_practice(db: &AppDb, word_id: &str, correct: bool) {
    if let Ok(tree) = db.vocabulary_logs() {
        let logs_key = format!("vocabulary_logs_{}", word_id);

        let mut logs = match tree.get(logs_key.as_bytes()) {
            Ok(Some(data)) => {
                serde_json::from_slice::<VocabularyLogs>(&data).unwrap_or(VocabularyLogs {
                    word_id: word_id.to_string(),
                    entries: vec![],
                })
            }
            _ => VocabularyLogs {
                word_id: word_id.to_string(),
                entries: vec![],
            },
        };

        let entry = VocabularyLogEntry {
            id: AppDb::generate_id(),
            word_id: word_id.to_string(),
            timestamp: AppDb::now_ms(),
            log_type: "practice".to_string(),
            practice_details: Some(serde_json::json!({ "isCorrect": correct })),
            update_details: None,
        };

        logs.entries.push(entry);
        if let Ok(json) = serde_json::to_vec(&logs) {
            let _ = tree.insert(logs_key.as_bytes(), json);
        }
    }
}

fn log_vocabulary_practice_session(db: &AppDb, word_id: &str, correct: bool, ex_type: &str) {
    if let Ok(tree) = db.vocabulary_session_logs() {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

        let mut session = match tree.get(today.as_bytes()) {
            Ok(Some(data)) => {
                serde_json::from_slice::<VocabularySessionLog>(&data).unwrap_or(VocabularySessionLog {
                    date: today.clone(),
                    total_attempts: 0,
                    correct_count: 0,
                    words_attempted: vec![],
                    multiple_choice_attempts: 0,
                    multiple_choice_correct: 0,
                    spell_word_attempts: 0,
                    spell_word_correct: 0,
                    type_word_attempts: 0,
                    type_word_correct: 0,
                    spell_verb_tense_attempts: 0,
                    spell_verb_tense_correct: 0,
                    choose_verb_tense_attempts: 0,
                    choose_verb_tense_correct: 0,
                })
            }
            _ => VocabularySessionLog {
                date: today.clone(),
                total_attempts: 0,
                correct_count: 0,
                words_attempted: vec![],
                multiple_choice_attempts: 0,
                multiple_choice_correct: 0,
                spell_word_attempts: 0,
                spell_word_correct: 0,
                type_word_attempts: 0,
                type_word_correct: 0,
                spell_verb_tense_attempts: 0,
                spell_verb_tense_correct: 0,
                choose_verb_tense_attempts: 0,
                choose_verb_tense_correct: 0,
            },
        };

        session.total_attempts += 1;
        if correct {
            session.correct_count += 1;
        }
        // Increment the correct per-exercise-type session stats
        match ex_type {
            "multiple-choice" => {
                session.multiple_choice_attempts += 1;
                if correct { session.multiple_choice_correct += 1; }
            }
            "spell-word" => {
                session.spell_word_attempts += 1;
                if correct { session.spell_word_correct += 1; }
            }
            "type-word" => {
                session.type_word_attempts += 1;
                if correct { session.type_word_correct += 1; }
            }
            "spell-verb-tense" | "spellVerbTense" => {
                session.spell_verb_tense_attempts += 1;
                if correct { session.spell_verb_tense_correct += 1; }
            }
            "choose-verb-tense" | "chooseVerbTense" => {
                session.choose_verb_tense_attempts += 1;
                if correct { session.choose_verb_tense_correct += 1; }
            }
            _ => {
                // Default to multiple-choice for unrecognized types
                session.multiple_choice_attempts += 1;
                if correct { session.multiple_choice_correct += 1; }
            }
        }
        if !session.words_attempted.contains(&word_id.to_string()) {
            session.words_attempted.push(word_id.to_string());
        }

        if let Ok(json) = serde_json::to_vec(&session) {
            let _ = tree.insert(today.as_bytes(), json);
        }
    }
}

fn delete_vocabulary_logs(db: &AppDb, word_id: &str) {
    if let Ok(tree) = db.vocabulary_logs() {
        let logs_key = format!("vocabulary_logs_{}", word_id);
        let _ = tree.remove(logs_key.as_bytes());
    }
}