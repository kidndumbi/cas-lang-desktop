use crate::db::AppDb;
use crate::models::*;
use serde_json::Value;
use warp::Filter;

pub fn exercise_ai_routes(
    db: std::sync::Arc<AppDb>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    let db_filter = warp::any().map(move || db.clone());

    // GET /api/exercise-ai/conversation/:exerciseId
    let get_conversation = warp::path!("api" / "exercise-ai" / "conversation" / String)
        .and(warp::get())
        .and(db_filter.clone())
        .and_then(handle_get_conversation);

    // POST /api/exercise-ai/conversation
    let save_conversation = warp::path!("api" / "exercise-ai" / "conversation")
        .and(warp::post())
        .and(warp::body::json::<SaveConversationRequest>())
        .and(db_filter.clone())
        .and_then(handle_save_conversation);

    // DELETE /api/exercise-ai/conversation/:exerciseId
    let delete_conversation = warp::path!("api" / "exercise-ai" / "conversation" / String)
        .and(warp::delete())
        .and(db_filter.clone())
        .and_then(handle_delete_conversation);

    get_conversation
        .or(save_conversation)
        .or(delete_conversation)
}

async fn handle_get_conversation(
    exercise_id: String,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.exercise_ai_conversations() {
        Ok(tree) => match tree.get(exercise_id.as_bytes()) {
            Ok(Some(data)) => {
                let conv: ExerciseAiConversation =
                    serde_json::from_slice(&data).unwrap_or(ExerciseAiConversation {
                        exercise_id: exercise_id.clone(),
                        messages: vec![],
                        last_updated: AppDb::now_ms(),
                    });
                let resp = ApiResponse::success(conv);
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::OK,
                ))
            }
            _ => {
                let conv = ExerciseAiConversation {
                    exercise_id,
                    messages: vec![],
                    last_updated: AppDb::now_ms(),
                };
                let resp = ApiResponse::success(conv);
                Ok(warp::reply::with_status(
                    warp::reply::json(&resp),
                    warp::http::StatusCode::OK,
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

async fn handle_save_conversation(
    data: SaveConversationRequest,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let conversation = ExerciseAiConversation {
        exercise_id: data.exercise_id.clone(),
        messages: data.messages,
        last_updated: AppDb::now_ms(),
    };

    match db.exercise_ai_conversations() {
        Ok(tree) => {
            let json = serde_json::to_vec(&conversation).unwrap();
            match tree.insert(data.exercise_id.as_bytes(), json) {
                Ok(_) => {
                    let resp = EmptyResponse::success();
                    Ok(warp::reply::with_status(
                        warp::reply::json(&resp),
                        warp::http::StatusCode::OK,
                    ))
                }
                Err(e) => {
                    let resp = EmptyResponse::error(&format!("DB insert error: {}", e));
                    Ok(warp::reply::with_status(
                        warp::reply::json(&resp),
                        warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                    ))
                }
            }
        }
        Err(e) => {
            let resp = EmptyResponse::error(&format!("DB error: {}", e));
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

async fn handle_delete_conversation(
    exercise_id: String,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.exercise_ai_conversations() {
        Ok(tree) => {
            let _ = tree.remove(exercise_id.as_bytes());
            let resp = EmptyResponse::success();
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::OK,
            ))
        }
        Err(e) => {
            let resp = EmptyResponse::error(&format!("DB error: {}", e));
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}