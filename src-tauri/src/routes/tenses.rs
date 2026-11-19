// TEMPORARY - remove after tenses DB is cleared
use crate::db::{clear_all_tenses, AppDb};
use crate::models::*;
use warp::Filter;

pub fn tenses_routes(
    db: std::sync::Arc<AppDb>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    warp::path!("api" / "tenses")
        .and(warp::delete())
        .and(warp::any().map(move || db.clone()))
        .and_then(handle_clear_tenses)
}

async fn handle_clear_tenses(
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match clear_all_tenses(&db) {
        Ok(count) => {
            let resp = ApiResponse::success(serde_json::json!({ "cleared": count }));
            Ok(warp::reply::with_status(warp::reply::json(&resp), warp::http::StatusCode::OK))
        }
        Err(e) => {
            let resp = ApiResponse::<serde_json::Value>::error(&format!("DB error: {}", e));
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}
