use crate::db::AppDb;
use crate::models::*;
use warp::Filter;

pub fn translate_routes(
    db: std::sync::Arc<AppDb>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    let _db_filter = warp::any().map(move || db.clone());

    // POST /api/translate
    let translate = warp::path!("api" / "translate")
        .and(warp::post())
        .and(warp::body::json::<TranslateRequest>())
        .and_then(handle_translate);

    translate
}

async fn handle_translate(
    data: TranslateRequest,
) -> Result<impl warp::Reply, warp::Rejection> {
    if data.text.is_empty() {
        let resp = ApiResponse::<String>::error("Text is not provided for translation.");
        return Ok(warp::reply::with_status(
            warp::reply::json(&resp),
            warp::http::StatusCode::BAD_REQUEST,
        ));
    }
    if data.source_language.is_empty() {
        let resp = ApiResponse::<String>::error("Source language is not provided for translation.");
        return Ok(warp::reply::with_status(
            warp::reply::json(&resp),
            warp::http::StatusCode::BAD_REQUEST,
        ));
    }
    if data.target_language.is_empty() {
        let resp = ApiResponse::<String>::error("Target language is not provided for translation.");
        return Ok(warp::reply::with_status(
            warp::reply::json(&resp),
            warp::http::StatusCode::BAD_REQUEST,
        ));
    }

    match call_libre_translate(
        &data.text,
        &data.source_language,
        &data.target_language,
        &data.libretranslate_url,
    )
    .await
    {
        Ok(translated) => {
            let resp = ApiResponse::success(translated);
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::OK,
            ))
        }
        Err(e) => {
            let resp = ApiResponse::<String>::error(&e);
            Ok(warp::reply::with_status(
                warp::reply::json(&resp),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

async fn call_libre_translate(
    text: &str,
    source_language: &str,
    target_language: &str,
    libretranslate_url: &str,
) -> Result<String, String> {
    let url = format!("{}/translate", libretranslate_url);
    let body = serde_json::json!({
        "q": text,
        "source": source_language,
        "target": target_language,
        "format": "text",
    });

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| format!("Translation request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "LibreTranslate API error: {} {}",
            response.status().as_u16(),
            response.status().canonical_reason().unwrap_or("Unknown")
        ));
    }

    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse translation response: {}", e))?;

    result["translatedText"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid response from LibreTranslate API - missing translatedText".to_string())
}