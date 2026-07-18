use crate::db::AppDb;
use std::sync::Arc;
use tauri::State;
use serde_json::Value;

pub struct DbState(pub Arc<AppDb>);

// ─── Vocabulary ────────────────────────────────────────────────

#[tauri::command] pub fn get_vocabulary(state: State<DbState>, practice_language: Option<String>, native_language: Option<String>) -> Result<Vec<Value>, String> {
    let tree = state.0.vocabulary().map_err(|e| e.to_string())?;
    let mut words: Vec<Value> = tree.iter().filter_map(|r| r.ok()).filter_map(|(_, v)| serde_json::from_slice::<Value>(&v).ok()).collect();
    if let Some(pl) = practice_language { words.retain(|w| w["practiceLanguage"].as_str() == Some(&pl)); }
    if let Some(nl) = native_language { words.retain(|w| w["nativeLanguage"].as_str() == Some(&nl)); }
    Ok(words)
}
#[tauri::command] pub fn create_vocabulary(state: State<DbState>, word: Value) -> Result<Value, String> {
    let tree = state.0.vocabulary().map_err(|e| e.to_string())?;
    let id = AppDb::generate_id(); let now = AppDb::now_ms();
    let mut w = word.clone();
    w["id"] = Value::String(id.clone()); w["createdAt"] = Value::Number(now.into());
    w["practiceCount"] = w.get("practiceCount").cloned().unwrap_or(Value::Number(0.into()));
    w["correctCount"] = w.get("correctCount").cloned().unwrap_or(Value::Number(0.into()));
    w["accuracyRate"] = w.get("accuracyRate").cloned().unwrap_or(Value::Number(0.into()));
    let json = serde_json::to_vec(&w).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(w)
}
#[tauri::command] pub fn update_vocabulary(state: State<DbState>, id: String, word: Value) -> Result<Value, String> {
    let tree = state.0.vocabulary().map_err(|e| e.to_string())?;
    let existing = tree.get(id.as_bytes()).map_err(|e| e.to_string())?.ok_or("Not found")?;
    let mut w: Value = serde_json::from_slice(&existing).map_err(|e| e.to_string())?;
    if let Some(obj) = word.as_object() { for (k, v) in obj { w[k] = v.clone(); } }
    let json = serde_json::to_vec(&w).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(w)
}
#[tauri::command] pub fn update_vocabulary_stats(state: State<DbState>, id: String, correct: bool, exercise_type: Option<String>) -> Result<(), String> {
    let tree = state.0.vocabulary().map_err(|e| e.to_string())?;
    let existing = tree.get(id.as_bytes()).map_err(|e| e.to_string())?.ok_or("Not found")?;
    let mut w: Value = serde_json::from_slice(&existing).map_err(|e| e.to_string())?;
    let pc = w["practiceCount"].as_i64().unwrap_or(0) as i32 + 1;
    let cc = w["correctCount"].as_i64().unwrap_or(0) as i32 + if correct { 1 } else { 0 };
    w["practiceCount"] = Value::Number(pc.into()); w["correctCount"] = Value::Number(cc.into());
    w["accuracyRate"] = Value::Number(serde_json::Number::from_f64(if pc > 0 { (cc as f64 / pc as f64) * 100.0 } else { 0.0 }).unwrap_or(0.into()));
    w["lastPracticed"] = Value::Number(AppDb::now_ms().into());
    let et = exercise_type.unwrap_or_else(|| "multiple-choice".to_string());
    match et.as_str() {
        "spell-word" => { w["swTotal"] = Value::Number((w["swTotal"].as_i64().unwrap_or(0)+1).into()); if correct { w["swCorrect"] = Value::Number((w["swCorrect"].as_i64().unwrap_or(0)+1).into()); } }
        "type-word" => { w["twTotal"] = Value::Number((w["twTotal"].as_i64().unwrap_or(0)+1).into()); if correct { w["twCorrect"] = Value::Number((w["twCorrect"].as_i64().unwrap_or(0)+1).into()); } }
        "choose-verb-tense" => { w["chooseVerbTenseTotal"] = Value::Number((w.get("chooseVerbTenseTotal").and_then(|v|v.as_i64()).unwrap_or(0)+1).into()); if correct { w["chooseVerbTenseCorrect"] = Value::Number((w.get("chooseVerbTenseCorrect").and_then(|v|v.as_i64()).unwrap_or(0)+1).into()); } }
        "spell-verb-tense" => { w["spellVerbTenseTotal"] = Value::Number((w.get("spellVerbTenseTotal").and_then(|v|v.as_i64()).unwrap_or(0)+1).into()); if correct { w["spellVerbTenseCorrect"] = Value::Number((w.get("spellVerbTenseCorrect").and_then(|v|v.as_i64()).unwrap_or(0)+1).into()); } }
        _ => { w["mcTotal"] = Value::Number((w["mcTotal"].as_i64().unwrap_or(0)+1).into()); if correct { w["mcCorrect"] = Value::Number((w["mcCorrect"].as_i64().unwrap_or(0)+1).into()); } }
    }
    let json = serde_json::to_vec(&w).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command] pub fn delete_vocabulary(state: State<DbState>, id: String) -> Result<(), String> { tree_remove(&state.0.vocabulary().map_err(|e| e.to_string())?, &id) }

// ─── Exercises ─────────────────────────────────────────────────

#[tauri::command] pub fn get_exercises(state: State<DbState>, practice_language: Option<String>, native_language: Option<String>) -> Result<Vec<Value>, String> {
    let tree = state.0.exercises().map_err(|e| e.to_string())?;
    let mut exercises: Vec<Value> = tree.iter().filter_map(|r| r.ok()).filter_map(|(_, v)| serde_json::from_slice::<Value>(&v).ok()).collect();
    if let Some(pl) = practice_language { exercises.retain(|e| e["practiceLanguage"].as_str() == Some(&pl)); }
    if let Some(nl) = native_language { exercises.retain(|e| e["nativeLanguage"].as_str() == Some(&nl)); }
    Ok(exercises)
}
#[tauri::command] pub fn create_exercise(state: State<DbState>, exercise: Value) -> Result<Value, String> {
    let tree = state.0.exercises().map_err(|e| e.to_string())?;
    let id = AppDb::generate_id(); let now = AppDb::now_ms();
    let mut ex = exercise.clone();
    ex["id"] = Value::String(id.clone()); ex["createdAt"] = Value::Number(now.into());
    ex["practiceCount"] = Value::Number(0.into()); ex["correctCount"] = Value::Number(0.into()); ex["accuracyRate"] = Value::Number(0.into());
    let json = serde_json::to_vec(&ex).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(ex)
}
#[tauri::command] pub fn update_exercise(state: State<DbState>, id: String, exercise: Value) -> Result<Value, String> {
    let tree = state.0.exercises().map_err(|e| e.to_string())?;
    let existing = tree.get(id.as_bytes()).map_err(|e| e.to_string())?.ok_or("Not found")?;
    let mut ex: Value = serde_json::from_slice(&existing).map_err(|e| e.to_string())?;
    if let Some(obj) = exercise.as_object() { for (k, v) in obj { ex[k] = v.clone(); } }
    let json = serde_json::to_vec(&ex).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(ex)
}
#[tauri::command] pub fn update_exercise_stats(state: State<DbState>, id: String, correct: bool) -> Result<(), String> {
    let tree = state.0.exercises().map_err(|e| e.to_string())?;
    let existing = tree.get(id.as_bytes()).map_err(|e| e.to_string())?.ok_or("Not found")?;
    let mut ex: Value = serde_json::from_slice(&existing).map_err(|e| e.to_string())?;
    let pc = ex["practiceCount"].as_i64().unwrap_or(0) as i32 + 1;
    let cc = ex["correctCount"].as_i64().unwrap_or(0) as i32 + if correct { 1 } else { 0 };
    ex["practiceCount"] = Value::Number(pc.into()); ex["correctCount"] = Value::Number(cc.into());
    ex["accuracyRate"] = Value::Number(serde_json::Number::from_f64(if pc > 0 { (cc as f64 / pc as f64) * 100.0 } else { 0.0 }).unwrap_or(0.into()));
    let json = serde_json::to_vec(&ex).map_err(|e| e.to_string())?;
    tree.insert(id.as_bytes(), json).map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command] pub fn delete_exercise(state: State<DbState>, id: String) -> Result<(), String> { tree_remove(&state.0.exercises().map_err(|e| e.to_string())?, &id) }

// ─── Tags ──────────────────────────────────────────────────────

#[tauri::command] pub fn get_tags(state: State<DbState>) -> Result<Vec<String>, String> {
    let tree = state.0.tags().map_err(|e| e.to_string())?;
    Ok(tree.iter().filter_map(|r| r.ok()).filter_map(|(k, _)| String::from_utf8(k.to_vec()).ok()).collect())
}
#[tauri::command] pub fn add_tag(state: State<DbState>, tag: String) -> Result<(), String> { state.0.tags().map_err(|e| e.to_string())?.insert(tag.as_bytes(), b"1").map_err(|e| e.to_string())?; Ok(()) }
#[tauri::command] pub fn delete_tag(state: State<DbState>, tag: String) -> Result<(), String> { tree_remove(&state.0.tags().map_err(|e| e.to_string())?, &tag) }

// ─── Tenses ────────────────────────────────────────────────────

#[tauri::command] pub fn get_tenses(state: State<DbState>, tenses_id: String) -> Result<Option<Value>, String> {
    let tree = state.0.tenses().map_err(|e| e.to_string())?;
    match tree.get(tenses_id.as_bytes()).map_err(|e| e.to_string())? {
        Some(data) => Ok(Some(serde_json::from_slice(&data).map_err(|e| e.to_string())?)),
        None => Ok(None),
    }
}
#[tauri::command] pub fn save_tenses(state: State<DbState>, word_id: String, data: Value) -> Result<String, String> {
    let tenses_id = data["id"].as_str().map(|s| s.to_string()).unwrap_or_else(AppDb::generate_id);
    let mut d = data.clone();
    d["id"] = Value::String(tenses_id.clone());
    let ttree = state.0.tenses().map_err(|e| e.to_string())?;
    ttree.insert(tenses_id.as_bytes(), serde_json::to_vec(&d).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    // Link to word
    let vtree = state.0.vocabulary().map_err(|e| e.to_string())?;
    if let Some(existing) = vtree.get(word_id.as_bytes()).map_err(|e| e.to_string())? {
        let mut w: Value = serde_json::from_slice(&existing).map_err(|e| e.to_string())?;
        w["tensesId"] = Value::String(tenses_id.clone());
        vtree.insert(word_id.as_bytes(), serde_json::to_vec(&w).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    }
    Ok(tenses_id)
}

// ─── Session & Exercise Logs ───────────────────────────────────

#[tauri::command] pub fn get_vocabulary_session_logs(state: State<DbState>) -> Result<Vec<Value>, String> {
    let tree = state.0.vocabulary_session_logs().map_err(|e| e.to_string())?;
    Ok(tree.iter().filter_map(|r| r.ok()).filter_map(|(_, v)| serde_json::from_slice::<Value>(&v).ok()).collect())
}
#[tauri::command] pub fn get_exercise_session_logs(state: State<DbState>) -> Result<Vec<Value>, String> {
    let tree = state.0.exercise_session_logs().map_err(|e| e.to_string())?;
    Ok(tree.iter().filter_map(|r| r.ok()).filter_map(|(_, v)| serde_json::from_slice::<Value>(&v).ok()).collect())
}
#[tauri::command] pub fn get_vocabulary_logs(state: State<DbState>, word_id: String) -> Result<Value, String> {
    let tree = state.0.vocabulary_logs().map_err(|e| e.to_string())?;
    let key = format!("vocabulary_logs_{}", word_id);
    match tree.get(key.as_bytes()).map_err(|e| e.to_string())? {
        Some(d) => Ok(serde_json::from_slice(&d).unwrap_or(serde_json::json!({"wordId": word_id, "entries": []}))),
        None => Ok(serde_json::json!({"wordId": word_id, "entries": []})),
    }
}
#[tauri::command] pub fn get_exercise_logs(state: State<DbState>, exercise_id: String) -> Result<Value, String> {
    let tree = state.0.exercise_logs().map_err(|e| e.to_string())?;
    let key = format!("exercise_logs_{}", exercise_id);
    match tree.get(key.as_bytes()).map_err(|e| e.to_string())? {
        Some(d) => Ok(serde_json::from_slice(&d).unwrap_or(serde_json::json!({"exerciseId": exercise_id, "entries": []}))),
        None => Ok(serde_json::json!({"exerciseId": exercise_id, "entries": []})),
    }
}

fn tree_remove(tree: &sled::Tree, key: &str) -> Result<(), String> { tree.remove(key.as_bytes()).map_err(|e| e.to_string())?; Ok::<(), String>(()) }
