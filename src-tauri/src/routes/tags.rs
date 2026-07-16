use crate::db::AppDb;
use crate::models::*;
use serde_json::Value;
use warp::Filter;

pub fn tag_routes(
    db: std::sync::Arc<AppDb>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    let db_filter = warp::any().map(move || db.clone());

    // GET /api/tags
    let get_all = warp::path!("api" / "tags")
        .and(warp::get())
        .and(db_filter.clone())
        .and_then(handle_get_all_tags);

    // POST /api/tags
    let add = warp::path!("api" / "tags")
        .and(warp::post())
        .and(warp::body::json::<Value>())
        .and(db_filter.clone())
        .and_then(handle_add_tag);

    // DELETE /api/tags/:name
    let delete = warp::path!("api" / "tags" / String)
        .and(warp::delete())
        .and(db_filter.clone())
        .and_then(handle_delete_tag);

    // GET /api/tags/:name/exists
    let exists = warp::path!("api" / "tags" / String / "exists")
        .and(warp::get())
        .and(db_filter.clone())
        .and_then(handle_tag_exists);

    get_all.or(add).or(delete).or(exists)
}

async fn handle_get_all_tags(
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.tags() {
        Ok(tree) => {
            let tags: Vec<String> = tree
                .iter()
                .filter_map(|r| r.ok())
                .filter_map(|(k, _)| String::from_utf8(k.to_vec()).ok())
                .collect();
            let resp = ApiResponse::success(tags);
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

async fn handle_add_tag(
    body: Value,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // The body is the tag name directly, or wrapped in { data: "tagname" }
    let tag_name = if let Some(data) = body.get("data") {
        data.as_str().unwrap_or("").to_string()
    } else if let Some(s) = body.as_str() {
        s.to_string()
    } else {
        let resp = EmptyResponse::error("Tag name is required");
        return Ok(warp::reply::with_status(
            warp::reply::json(&resp),
            warp::http::StatusCode::BAD_REQUEST,
        ));
    };

    if tag_name.is_empty() {
        let resp = EmptyResponse::error("Tag name is required");
        return Ok(warp::reply::with_status(
            warp::reply::json(&resp),
            warp::http::StatusCode::BAD_REQUEST,
        ));
    }

    match db.tags() {
        Ok(tree) => {
            let _ = tree.insert(tag_name.as_bytes(), b"1");
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

async fn handle_delete_tag(
    name: String,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.tags() {
        Ok(tree) => {
            let _ = tree.remove(name.as_bytes());
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

async fn handle_tag_exists(
    name: String,
    db: std::sync::Arc<AppDb>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match db.tags() {
        Ok(tree) => {
            let exists = tree.get(name.as_bytes()).ok().flatten().is_some();
            let resp = ApiResponse::success(exists);
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