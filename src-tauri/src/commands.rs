use crate::db::AppDb;
use std::sync::Arc;
use tauri::State;
use serde_json::Value;

pub struct DbState(pub Arc<AppDb>);

// ─── Vocabulary commands ───────────────────────────────────────

#[tauri::command]
pub fn get_vocabulary(
    state: State<DbState>,
    practice_language: Option<String>,
    native_language: Option<String>,
) -> Result<Vec<Value>, String> {
    let tree = state.0.vocabulary().map_err(|e| e.to_string())?;
    let mut words: Vec<Value> = tree.iter().filter_map(|r| r.ok())
        .filter_map(|(_, v)| serde_json::from_slice::<Value>(&v).ok())
        .collect();
    if let Some(pl) = practice_language {
        words.retain(|w| w["practiceLanguage"].as_str() == Some(&pl));
    }
    if let Some(nl) = native_language {
        words.retain(|w| w["nativeLanguage"].as_str() == Some(&nl));
    }
    Ok(words)
}

#[tauri::command]
pub fn create_vocabulary(state: State<DbState>, word: Value) -> Result<Value, String> {
    let tree = state.0.vocabulary().map_err(|e| e.to_string())?;
    let id = AppDb::generate_id();
    let now = AppDb::now_ms();
    let mut w = word.clone();
    w["id"] = Value::String(id.clone());
    w["createdAt"] = Value::Number(now.into());
    w["practiceCount"] = Value::Number(0.into());
    w["correctCount"] = Value::Number(0.into());
    w["accuracyRate"] = Value::Number(0.into());
    let json = serde_json::to_vec(&w).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(w)
}

#[tauri::command]
pub fn update_vocabulary(state: State<DbState>, id: String, word: Value) -> Result<Value, String> {
    let tree = state.0.vocabulary().map_err(|e| e.to_string())?;
    let existing = tree.get(id.as_bytes()).map_err(|e| e.to_string())?
        .ok_or("Not found")?;
    let mut w: Value = serde_json::from_slice(&existing).map_err(|e| e.to_string())?;
    // Merge fields from word into w
    if let Some(obj) = word.as_object() {
        for (k, v) in obj {
            w[k] = v.clone();
        }
    }
    let json = serde_json::to_vec(&w).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(w)
}

#[tauri::command]
pub fn update_vocabulary_stats(state: State<DbState>, id: String, correct: bool, exercise_type: Option<String>) -> Result<(), String> {
    let tree = state.0.vocabulary().map_err(|e| e.to_string())?;
    let existing = tree.get(id.as_bytes()).map_err(|e| e.to_string())?
        .ok_or("Not found")?;
    let mut w: Value = serde_json::from_slice(&existing).map_err(|e| e.to_string())?;
    let pc = w["practiceCount"].as_i64().unwrap_or(0) as i32 + 1;
    let cc = w["correctCount"].as_i64().unwrap_or(0) as i32 + if correct { 1 } else { 0 };
    w["practiceCount"] = Value::Number(pc.into());
    w["correctCount"] = Value::Number(cc.into());
    w["accuracyRate"] = Value::Number(serde_json::Number::from_f64(
        if pc > 0 { (cc as f64 / pc as f64) * 100.0 } else { 0.0 }
    ).unwrap_or(0.into()));
    w["lastPracticed"] = Value::Number(AppDb::now_ms().into());

    let et = exercise_type.unwrap_or_else(|| "multiple-choice".to_string());
    match et.as_str() {
        "multiple-choice" => {
            w["mcTotal"] = Value::Number((w["mcTotal"].as_i64().unwrap_or(0) + 1).into());
            if correct { w["mcCorrect"] = Value::Number((w["mcCorrect"].as_i64().unwrap_or(0) + 1).into()); }
        }
        "spell-word" => {
            w["swTotal"] = Value::Number((w["swTotal"].as_i64().unwrap_or(0) + 1).into());
            if correct { w["swCorrect"] = Value::Number((w["swCorrect"].as_i64().unwrap_or(0) + 1).into()); }
        }
        "type-word" => {
            w["twTotal"] = Value::Number((w["twTotal"].as_i64().unwrap_or(0) + 1).into());
            if correct { w["twCorrect"] = Value::Number((w["twCorrect"].as_i64().unwrap_or(0) + 1).into()); }
        }
        _ => {}
    }

    let json = serde_json::to_vec(&w).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_vocabulary(state: State<DbState>, id: String) -> Result<(), String> {
    let tree = state.0.vocabulary().map_err(|e| e.to_string())?;
    tree.remove(id.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Exercise commands ─────────────────────────────────────────

#[tauri::command]
pub fn get_exercises(
    state: State<DbState>,
    practice_language: Option<String>,
    native_language: Option<String>,
) -> Result<Vec<Value>, String> {
    let tree = state.0.exercises().map_err(|e| e.to_string())?;
    let mut exercises: Vec<Value> = tree.iter().filter_map(|r| r.ok())
        .filter_map(|(_, v)| serde_json::from_slice::<Value>(&v).ok())
        .collect();
    if let Some(pl) = practice_language {
        exercises.retain(|e| e["practiceLanguage"].as_str() == Some(&pl));
    }
    if let Some(nl) = native_language {
        exercises.retain(|e| e["nativeLanguage"].as_str() == Some(&nl));
    }
    Ok(exercises)
}

#[tauri::command]
pub fn create_exercise(state: State<DbState>, exercise: Value) -> Result<Value, String> {
    let tree = state.0.exercises().map_err(|e| e.to_string())?;
    let id = AppDb::generate_id();
    let now = AppDb::now_ms();
    let mut ex = exercise.clone();
    ex["id"] = Value::String(id.clone());
    ex["createdAt"] = Value::Number(now.into());
    ex["practiceCount"] = Value::Number(0.into());
    ex["correctCount"] = Value::Number(0.into());
    ex["accuracyRate"] = Value::Number(0.into());
    let json = serde_json::to_vec(&ex).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(ex)
}

#[tauri::command]
pub fn delete_exercise(state: State<DbState>, id: String) -> Result<(), String> {
    let tree = state.0.exercises().map_err(|e| e.to_string())?;
    tree.remove(id.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Tag commands ──────────────────────────────────────────────

#[tauri::command]
pub fn get_tags(state: State<DbState>) -> Result<Vec<String>, String> {
    let tree = state.0.tags().map_err(|e| e.to_string())?;
    let tags: Vec<String> = tree.iter().filter_map(|r| r.ok())
        .filter_map(|(k, _)| String::from_utf8(k.to_vec()).ok())
        .collect();
    Ok(tags)
}

#[tauri::command]
pub fn add_tag(state: State<DbState>, tag: String) -> Result<(), String> {
    let tree = state.0.tags().map_err(|e| e.to_string())?;
    tree.insert(tag.as_bytes(), b"1").map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_tag(state: State<DbState>, tag: String) -> Result<(), String> {
    let tree = state.0.tags().map_err(|e| e.to_string())?;
    tree.remove(tag.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}