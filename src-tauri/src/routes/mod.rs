pub mod vocabulary;
pub mod exercises;
pub mod tags;
pub mod translate;
pub mod exercise_ai;
pub mod tenses;
pub mod migrate;

use crate::db::AppDb;
use warp::Filter;

pub fn all_routes(
    db: std::sync::Arc<AppDb>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    vocabulary::vocabulary_routes(db.clone())
        .or(exercises::exercise_routes(db.clone()))
        .or(tags::tag_routes(db.clone()))
        .or(translate::translate_routes(db.clone()))
        .or(exercise_ai::exercise_ai_routes(db.clone()))
        .or(tenses::tenses_routes(db.clone()))
        .or(migrate::migrate_routes(db.clone()))
}
