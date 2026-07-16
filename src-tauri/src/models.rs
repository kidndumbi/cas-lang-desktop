use serde::{Deserialize, Serialize};

// ─── Vocabulary ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VocabularyWord {
    pub id: String,
    pub word: String,
    pub translation: String,
    pub practice_language: String, // "en" | "es" | "fr"
    pub native_language: String,   // "en" | "es" | "fr"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<String>, // "easy" | "medium" | "hard"
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default)]
    pub practice_count: i32,
    #[serde(default)]
    pub correct_count: i32,
    #[serde(default)]
    pub accuracy_rate: f64,
    #[serde(default)]
    pub mc_total: i32,
    #[serde(default)]
    pub mc_correct: i32,
    #[serde(default)]
    pub sw_total: i32,
    #[serde(default)]
    pub sw_correct: i32,
    #[serde(default)]
    pub tw_total: i32,
    #[serde(default)]
    pub tw_correct: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_verb_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tenses_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    pub created_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_practiced: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVocabularyWord {
    pub word: String,
    pub translation: String,
    pub practice_language: String,
    pub native_language: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_verb_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVocabularyWord {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub word: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub translation: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub practice_language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub native_language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_verb_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tenses_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVocabularyStatsRequest {
    pub correct: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exercise_type: Option<String>, // "multiple-choice" | "spell-word"
}

// ─── Vocabulary Logs ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VocabularyLogEntry {
    pub id: String,
    pub word_id: String,
    pub timestamp: i64,
    #[serde(rename = "type")]
    pub log_type: String, // "practice" | "word-update"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub practice_details: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub update_details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VocabularyLogs {
    pub word_id: String,
    pub entries: Vec<VocabularyLogEntry>,
}

// ─── Vocabulary Session Logs ────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VocabularySessionLog {
    pub date: String, // "YYYY-MM-DD"
    pub total_attempts: i32,
    pub correct_count: i32,
    pub words_attempted: Vec<String>,
    #[serde(default)]
    pub multiple_choice_attempts: i32,
    #[serde(default)]
    pub multiple_choice_correct: i32,
    #[serde(default)]
    pub spell_word_attempts: i32,
    #[serde(default)]
    pub spell_word_correct: i32,
    #[serde(default)]
    pub type_word_attempts: i32,
    #[serde(default)]
    pub type_word_correct: i32,
    #[serde(default)]
    pub spell_verb_tense_attempts: i32,
    #[serde(default)]
    pub spell_verb_tense_correct: i32,
    #[serde(default)]
    pub choose_verb_tense_attempts: i32,
    #[serde(default)]
    pub choose_verb_tense_correct: i32,
}

// ─── Language Learning Exercise ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguageLearningExercise {
    pub id: String,
    pub video_file_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_file_name: Option<String>,
    pub practice_language_text: String,
    pub native_language_text: String,
    pub practice_language: String,
    pub native_language: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<String>,
    pub word_count: i32,
    pub start_time: f64,
    pub end_time: f64,
    pub created_at: i64,
    #[serde(default)]
    pub practice_count: i32,
    #[serde(default)]
    pub correct_count: i32,
    #[serde(default)]
    pub accuracy_rate: f64,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLanguageLearningExercise {
    pub video_file_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub video_file_name: Option<String>,
    pub practice_language_text: String,
    pub native_language_text: String,
    pub practice_language: String,
    pub native_language: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<String>,
    pub word_count: i32,
    pub start_time: f64,
    pub end_time: f64,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateExerciseStatsRequest {
    pub correct: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snapshot: Option<ExercisePracticeSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExercisePracticeSnapshot {
    pub user_answer: String,
    pub correct_answer: String,
    pub native_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub practice_mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<String>>,
}

// ─── Exercise Logs ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseLogEntry {
    pub id: String,
    pub exercise_id: String,
    pub timestamp: i64,
    #[serde(rename = "type")]
    pub log_type: String, // "practice" | "exercise-update"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub practice_details: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub update_details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseLogs {
    pub exercise_id: String,
    pub entries: Vec<ExerciseLogEntry>,
}

// ─── Exercise Session Logs ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PracticeSessionLog {
    pub date: String,
    pub total_attempts: i32,
    pub correct_count: i32,
    pub exercises_attempted: Vec<String>,
    #[serde(default)]
    pub arrange_words_attempts: i32,
    #[serde(default)]
    pub arrange_words_correct: i32,
    #[serde(default)]
    pub fill_in_missing_attempts: i32,
    #[serde(default)]
    pub fill_in_missing_correct: i32,
    #[serde(default)]
    pub spell_the_blanks_attempts: i32,
    #[serde(default)]
    pub spell_the_blanks_correct: i32,
    #[serde(default)]
    pub conversation_attempts: i32,
    #[serde(default)]
    pub conversation_correct: i32,
}

// ─── Tenses ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TenseEntry {
    pub pronoun: String,
    pub conjugation: String,
    pub translation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerbTenseData {
    #[serde(rename = "tenseName")]
    pub tense_name: String,
    pub description: String,
    pub entries: Vec<TenseEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerbTensesData {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub word: String,
    #[serde(rename = "indicativeSimple")]
    pub indicative_simple: Vec<VerbTenseData>,
    #[serde(rename = "indicativeCompound")]
    pub indicative_compound: Vec<VerbTenseData>,
    #[serde(rename = "subjunctiveSimple")]
    pub subjunctive_simple: Vec<VerbTenseData>,
    #[serde(rename = "subjunctiveCompound")]
    pub subjunctive_compound: Vec<VerbTenseData>,
    pub imperative: Vec<VerbTenseData>,
}

// ─── Exercise AI Chat ───────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseAiMessage {
    pub role: String, // "user" | "assistant"
    pub content: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseAiConversation {
    pub exercise_id: String,
    pub messages: Vec<ExerciseAiMessage>,
    pub last_updated: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveConversationRequest {
    pub exercise_id: String,
    pub messages: Vec<ExerciseAiMessage>,
}

// ─── Translation ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslateRequest {
    pub text: String,
    #[serde(rename = "sourceLanguage")]
    pub source_language: String,
    #[serde(rename = "targetLanguage")]
    pub target_language: String,
    #[serde(default = "default_libretranslate_url")]
    #[serde(rename = "libretranslateUrl")]
    pub libretranslate_url: String,
}

fn default_libretranslate_url() -> String {
    "http://localhost:5000".to_string()
}

// ─── Generic response ───────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.to_string()),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmptyResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl EmptyResponse {
    pub fn success() -> Self {
        Self {
            success: true,
            error: None,
        }
    }

    #[allow(dead_code)]
    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            error: Some(message.to_string()),
        }
    }
}