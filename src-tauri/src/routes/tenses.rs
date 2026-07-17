use crate::db::AppDb;
use crate::models::*;
use serde_json::Value;
use warp::Filter;

pub fn tenses_routes(
    db: std::sync::Arc<AppDb>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    let db_filter = warp::any().map(move || db.clone());

    let get_tenses = warp::path!("api" / "tenses" / String)
        .and(warp::get())
        .and(db_filter.clone())
        .and_then(handle_get_tenses);

    let save_tenses = warp::path!("api" / "tenses")
        .and(warp::post())
        .and(warp::body::json::<VerbTensesData>())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(db_filter.clone())
        .and_then(handle_save_tenses);

    let delete_tenses = warp::path!("api" / "tenses" / String)
        .and(warp::delete())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(db_filter.clone())
        .and_then(handle_delete_tenses);

    get_tenses.or(save_tenses).or(delete_tenses)
}

async fn handle_get_tenses(
    tenses_id: String,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let tree = match db.tenses() {
        Ok(t) => t,
        Err(e) => {
            let resp = ApiResponse::<Value>::error(&format!("DB error: {}", e));
            return Ok(warp::reply::with_status(warp::reply::json(&resp), warp::http::StatusCode::INTERNAL_SERVER_ERROR));
        }
    };

    // Try raw key first, then "tense_{}" prefix (from migration)
    let bytes = tree.get(tenses_id.as_bytes()).ok().flatten()
        .or_else(|| tree.get(format!("tense_{}", tenses_id).as_bytes()).ok().flatten());

    match bytes {
        Some(data) => {
            let raw: Value = serde_json::from_slice(&data).unwrap_or(Value::Null);
            let resp = ApiResponse::success(raw);
            Ok(warp::reply::with_status(warp::reply::json(&resp), warp::http::StatusCode::OK))
        }
        None => {
            let resp = ApiResponse::<Value>::error("Tenses not found");
            Ok(warp::reply::with_status(warp::reply::json(&resp), warp::http::StatusCode::NOT_FOUND))
        }
    }
}

async fn handle_save_tenses(
    data: VerbTensesData,
    query: std::collections::HashMap<String, String>,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let word_id = match query.get("wordId") {
        Some(id) => id.clone(),
        None => {
            let resp = EmptyResponse::error("wordId query parameter is required");
            return Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::BAD_REQUEST,
            ));
        }
    };

    let tenses_id = data.id.clone().unwrap_or_else(AppDb::generate_id);

    let tenses_data = VerbTensesData {
        id: Some(tenses_id.clone()),
        ..data
    };

    match db.tenses() {
        Ok(tree) => {
            let json = serde_json::to_vec(&tenses_data).unwrap();
            let _ = tree.insert(tenses_id.as_bytes(), json);
        }
        Err(e) => {
            let resp = EmptyResponse::error(&format!("DB error: {}", e));
            return Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ));
        }
    }

    match db.vocabulary() {
        Ok(tree) => {
            if let Ok(Some(existing)) = tree.get(word_id.as_bytes()) {
                let mut word: VocabularyWord = serde_json::from_slice(&existing).unwrap();
                word.tenses_id = Some(tenses_id.clone());
                let json = serde_json::to_vec(&word).unwrap();
                let _ = tree.insert(word_id.as_bytes(), json);
            }
        }
        Err(_) => {}
    }

    let resp = ApiResponse::success(serde_json::json!({ "tensesId": tenses_id }));
    Ok(warp::reply::with_status(
        warp::reply::json(&resp),
        warp::http::StatusCode::OK,
    ))
}

async fn handle_delete_tenses(
    tenses_id: String,
    query: std::collections::HashMap<String, String>,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.tenses() {
        Ok(tree) => {
            let _ = tree.remove(tenses_id.as_bytes());
        }
        Err(e) => {
            let resp = EmptyResponse::error(&format!("DB error: {}", e));
            return Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ));
        }
    }

    if let Some(word_id) = query.get("wordId") {
        match db.vocabulary() {
            Ok(tree) => {
                if let Ok(Some(existing)) = tree.get(word_id.as_bytes()) {
                    let mut word: VocabularyWord = serde_json::from_slice(&existing).unwrap();
                    word.tenses_id = None;
                    let json = serde_json::to_vec(&word).unwrap();
                    let _ = tree.insert(word_id.as_bytes(), json);
                }
            }
            Err(_) => {}
        }
    }

    let resp = EmptyResponse::success();
    Ok(warp::reply::with_status(
        warp::reply::json(&resp),
        warp::http::StatusCode::OK,
    ))
}