use crate::db::AppDb;
use crate::models::*;
use serde_json::Value;
use std::collections::HashMap;
use warp::Filter;

pub fn exercise_routes(
    db: std::sync::Arc<AppDb>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    let db_filter = warp::any().map(move || db.clone());

    // GET /api/exercises
    let get_all = warp::path!("api" / "exercises")
        .and(warp::get())
        .and(warp::query::<HashMap<String, String>>())
        .and(db_filter.clone())
        .and_then(handle_get_all_exercises);

    // POST /api/exercises
    let create = warp::path!("api" / "exercises")
        .and(warp::post())
        .and(warp::body::json::<CreateLanguageLearningExercise>())
        .and(db_filter.clone())
        .and_then(handle_create_exercise);

    // PUT /api/exercises/:id
    let update = warp::path!("api" / "exercises" / String)
        .and(warp::put())
        .and(warp::body::json::<LanguageLearningExercise>())
        .and(db_filter.clone())
        .and_then(handle_update_exercise);

    // PATCH /api/exercises/:id/stats
    let update_stats = warp::path!("api" / "exercises" / String / "stats")
        .and(warp::patch())
        .and(warp::body::json::<UpdateExerciseStatsRequest>())
        .and(db_filter.clone())
        .and_then(handle_update_exercise_stats);

    // DELETE /api/exercises/:id
    let delete = warp::path!("api" / "exercises" / String)
        .and(warp::delete())
        .and(db_filter.clone())
        .and_then(handle_delete_exercise);

    // GET /api/exercises/:id/logs
    let get_logs = warp::path!("api" / "exercises" / String / "logs")
        .and(warp::get())
        .and(db_filter.clone())
        .and_then(handle_get_exercise_logs);

    // GET /api/exercises/session-logs
    let get_session_logs = warp::path!("api" / "exercises" / "session-logs")
        .and(warp::get())
        .and(db_filter.clone())
        .and_then(handle_get_exercise_session_logs);

    get_all
        .or(create)
        .or(update_stats)
        .or(update)
        .or(delete)
        .or(get_session_logs)
        .or(get_logs)
}

async fn handle_get_all_exercises(
    query: HashMap<String, String>,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.exercises() {
        Ok(tree) => {
            let mut exercises: Vec<LanguageLearningExercise> = tree
                .iter()
                .filter_map(|r| r.ok())
                .filter_map(|(_, v)| serde_json::from_slice::<LanguageLearningExercise>(&v).ok())
                .collect();

            if let Some(pl) = query.get("practiceLanguage") {
                exercises.retain(|e| e.practice_language == *pl);
            }
            if let Some(nl) = query.get("nativeLanguage") {
                exercises.retain(|e| e.native_language == *nl);
            }

            let resp = ApiResponse::success(exercises);
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

async fn handle_create_exercise(
    data: CreateLanguageLearningExercise,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let id = AppDb::generate_id();
    let now = AppDb::now_ms();

    let exercise = LanguageLearningExercise {
        id: id.clone(),
        video_file_path: data.video_file_path,
        video_file_name: data.video_file_name,
        practice_language_text: data.practice_language_text,
        native_language_text: data.native_language_text,
        practice_language: data.practice_language,
        native_language: data.native_language,
        difficulty: data.difficulty,
        word_count: data.word_count,
        start_time: data.start_time,
        end_time: data.end_time,
        created_at: now,
        practice_count: 0,
        correct_count: 0,
        accuracy_rate: 0.0,
        tags: data.tags,
    };

    match db.exercises() {
        Ok(tree) => {
            let json = serde_json::to_vec(&exercise).unwrap();
            match tree.insert(id.as_bytes(), json) {
                Ok(_) => {
                    let resp = ApiResponse::success(exercise);
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

async fn handle_update_exercise(
    id: String,
    data: LanguageLearningExercise,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.exercises() {
        Ok(tree) => match tree.get(id.as_bytes()) {
            Ok(Some(existing)) => {
                let old: LanguageLearningExercise = serde_json::from_slice(&existing).unwrap();
                let before = serde_json::to_value(&old).unwrap();
                let after = serde_json::to_value(&data).unwrap();

                let json = serde_json::to_vec(&data).unwrap();
                let _ = tree.insert(id.as_bytes(), json);

                log_exercise_update(&db, &id, &before, &after);

                let resp = ApiResponse::success(data);
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::OK,
                ))
            }
            Ok(None) => {
                let resp = ApiResponse::<Value>::error("Exercise not found");
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

async fn handle_update_exercise_stats(
    id: String,
    data: UpdateExerciseStatsRequest,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.exercises() {
        Ok(tree) => match tree.get(id.as_bytes()) {
            Ok(Some(existing)) => {
                let mut exercise: LanguageLearningExercise =
                    serde_json::from_slice(&existing).unwrap();

                exercise.practice_count += 1;
                if data.correct {
                    exercise.correct_count += 1;
                }
                exercise.accuracy_rate = if exercise.practice_count > 0 {
                    (exercise.correct_count as f64 / exercise.practice_count as f64) * 100.0
                } else {
                    0.0
                };

                let json = serde_json::to_vec(&exercise).unwrap();
                let _ = tree.insert(id.as_bytes(), json);

                // Log practice with snapshot
                if let Some(snapshot) = &data.snapshot {
                    log_exercise_practice(
                        &db,
                        &id,
                        data.correct,
                        &snapshot.user_answer,
                        &snapshot.correct_answer,
                        &snapshot.native_text,
                        snapshot.practice_mode.as_deref().unwrap_or(""),
                        &snapshot.options,
                    );
                } else {
                    log_exercise_practice(
                        &db,
                        &id,
                        data.correct,
                        "",
                        "",
                        "",
                        "",
                        &None,
                    );
                }
                log_exercise_practice_session(&db, &id, data.correct, &data.snapshot);

                let resp = EmptyResponse::success();
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::OK,
                ))
            }
            Ok(None) => {
                let resp = EmptyResponse::error("Exercise not found");
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

async fn handle_delete_exercise(
    id: String,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.exercises() {
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

    delete_exercise_logs(&db, &id);

    let resp = EmptyResponse::success();
    Ok(warp::reply::with_status(
        warp::reply::json(&resp),
        warp::http::StatusCode::OK,
    ))
}

async fn handle_get_exercise_logs(
    id: String,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.exercise_logs() {
        Ok(tree) => {
            let logs_key = format!("exercise_logs_{}", id);
            match tree.get(logs_key.as_bytes()) {
                Ok(Some(data)) => {
                    let logs: ExerciseLogs =
                        serde_json::from_slice(&data).unwrap_or(ExerciseLogs {
                            exercise_id: id,
                            entries: vec![],
                        });
                    let resp = ApiResponse::success(logs);
                    Ok(warp::reply::with_status(
                        warp::reply::json(&resp),
                        warp::http::StatusCode::OK,
                    ))
                }
                _ => {
                    let resp = ApiResponse::success(ExerciseLogs {
                        exercise_id: id,
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

async fn handle_get_exercise_session_logs(
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.exercise_session_logs() {
        Ok(tree) => {
            let logs: Vec<PracticeSessionLog> = tree
                .iter()
                .filter_map(|r| r.ok())
                .filter_map(|(_, v)| serde_json::from_slice::<PracticeSessionLog>(&v).ok())
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

fn log_exercise_update(db: &AppDb, exercise_id: &str, before: &Value, after: &Value) {
    if let Ok(tree) = db.exercise_logs() {
        let logs_key = format!("exercise_logs_{}", exercise_id);

        let mut logs = match tree.get(logs_key.as_bytes()) {
            Ok(Some(data)) => {
                serde_json::from_slice::<ExerciseLogs>(&data).unwrap_or(ExerciseLogs {
                    exercise_id: exercise_id.to_string(),
                    entries: vec![],
                })
            }
            _ => ExerciseLogs {
                exercise_id: exercise_id.to_string(),
                entries: vec![],
            },
        };

        let changed_fields: Vec<String> =
            if let (Value::Object(before_map), Value::Object(after_map)) = (before, after) {
                before_map
                    .iter()
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

        let entry = ExerciseLogEntry {
            id: AppDb::generate_id(),
            exercise_id: exercise_id.to_string(),
            timestamp: AppDb::now_ms(),
            log_type: "exercise-update".to_string(),
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

fn log_exercise_practice(
    db: &AppDb,
    exercise_id: &str,
    correct: bool,
    user_answer: &str,
    correct_answer: &str,
    native_text: &str,
    practice_mode: &str,
    options: &Option<Vec<String>>,
) {
    if let Ok(tree) = db.exercise_logs() {
        let logs_key = format!("exercise_logs_{}", exercise_id);

        let mut logs = match tree.get(logs_key.as_bytes()) {
            Ok(Some(data)) => {
                serde_json::from_slice::<ExerciseLogs>(&data).unwrap_or(ExerciseLogs {
                    exercise_id: exercise_id.to_string(),
                    entries: vec![],
                })
            }
            _ => ExerciseLogs {
                exercise_id: exercise_id.to_string(),
                entries: vec![],
            },
        };

        let entry = ExerciseLogEntry {
            id: AppDb::generate_id(),
            exercise_id: exercise_id.to_string(),
            timestamp: AppDb::now_ms(),
            log_type: "practice".to_string(),
            practice_details: Some(serde_json::json!({
                "isCorrect": correct,
                "userAnswer": user_answer,
                "correctAnswer": correct_answer,
                "nativeText": native_text,
                "practiceMode": practice_mode,
                "options": options,
            })),
            update_details: None,
        };

        logs.entries.push(entry);
        if let Ok(json) = serde_json::to_vec(&logs) {
            let _ = tree.insert(logs_key.as_bytes(), json);
        }
    }
}

fn log_exercise_practice_session(
    db: &AppDb,
    exercise_id: &str,
    correct: bool,
    snapshot: &Option<ExercisePracticeSnapshot>,
) {
    if let Ok(tree) = db.exercise_session_logs() {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

        let mut session = match tree.get(today.as_bytes()) {
            Ok(Some(data)) => {
                serde_json::from_slice::<PracticeSessionLog>(&data).unwrap_or(PracticeSessionLog {
                    date: today.clone(),
                    total_attempts: 0,
                    correct_count: 0,
                    exercises_attempted: vec![],
                    arrange_words_attempts: 0,
                    arrange_words_correct: 0,
                    fill_in_missing_attempts: 0,
                    fill_in_missing_correct: 0,
                    spell_the_blanks_attempts: 0,
                    spell_the_blanks_correct: 0,
                    conversation_attempts: 0,
                    conversation_correct: 0,
                })
            }
            _ => PracticeSessionLog {
                date: today.clone(),
                total_attempts: 0,
                correct_count: 0,
                exercises_attempted: vec![],
                arrange_words_attempts: 0,
                arrange_words_correct: 0,
                fill_in_missing_attempts: 0,
                fill_in_missing_correct: 0,
                spell_the_blanks_attempts: 0,
                spell_the_blanks_correct: 0,
                conversation_attempts: 0,
                conversation_correct: 0,
            },
        };

        session.total_attempts += 1;
        if correct {
            session.correct_count += 1;
        }

        // Track per-mode stats
        let mode = snapshot
            .as_ref()
            .and_then(|s| s.practice_mode.as_deref())
            .unwrap_or("");
        match mode {
            "arrange-words" => {
                session.arrange_words_attempts += 1;
                if correct {
                    session.arrange_words_correct += 1;
                }
            }
            "fill-in-missing" => {
                session.fill_in_missing_attempts += 1;
                if correct {
                    session.fill_in_missing_correct += 1;
                }
            }
            "spell-the-blanks" => {
                session.spell_the_blanks_attempts += 1;
                if correct {
                    session.spell_the_blanks_correct += 1;
                }
            }
            "conversation" => {
                session.conversation_attempts += 1;
                if correct {
                    session.conversation_correct += 1;
                }
            }
            _ => {}
        }

        if !session
            .exercises_attempted
            .contains(&exercise_id.to_string())
        {
            session.exercises_attempted.push(exercise_id.to_string());
        }

        if let Ok(json) = serde_json::to_vec(&session) {
            let _ = tree.insert(today.as_bytes(), json);
        }
    }
}

fn delete_exercise_logs(db: &AppDb, exercise_id: &str) {
    if let Ok(tree) = db.exercise_logs() {
        let logs_key = format!("exercise_logs_{}", exercise_id);
        let _ = tree.remove(logs_key.as_bytes());
    }
}