use crate::structs::base::{DiscordCommand, EnabledFor};
use serde::{Deserialize, Serialize};
use valorant_assets_api::models::language::Language;

#[derive(Serialize, Deserialize, Debug)]
pub struct CommandEntry {
    pub command: DiscordCommand,
    pub enabled_for: EnabledFor,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TranslationEntry {
    #[serde(rename = "type")]
    pub type_: String,
    pub language: String,
    pub officer: String,
    pub bot: TranslationBotLanguages,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct TranslationBotLanguages {
    en: TranslationBot,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct TranslationBot {
    base: TranslationBotBase,
    agent: TranslationBotAgent,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct TranslationBotBase {
    role: String,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct TranslationBotAgent {
    unknown: TranslationBotTitleDesc,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct TranslationBotTitleDesc {
    title: String,
    description: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Settings {
    pub guild: String,
    pub language: String,
    pub channels: SettingChannels,
    pub backgrounds: SettingBackgrounds,
    pub autoroles: SettingAutorole,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SettingChannels {
    pub game_news: Option<String>,
    pub other_news: Option<String>,
    pub server_status: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SettingBackgrounds {
    pub stats: Option<String>,
    pub game: Option<String>,
    pub mmr: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SettingAutorole {
    #[serde(rename = "type")]
    pub type_: Option<String>,
    pub config: Vec<SettingAutoroleConfig>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SettingAutoroleConfig {
    pub role: String,
    pub rank: String,
}
