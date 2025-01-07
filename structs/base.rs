use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize, Debug)]
pub struct EnabledFor {
    pub builds: Vec<String>,
    pub guilds: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DiscordCommand {
    #[serde(rename = "type")]
    pub type_: u8,
    pub name: String,
    pub description: String,
    pub dm_permission: bool,
    pub default_member_permissions: Option<String>,
    pub options: Vec<DiscordCommandOption>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DiscordCommandOption {
    #[serde(rename = "type")]
    pub type_: u8,
    pub name: String,
    pub description: String,
    pub required: bool,
    pub choices: Option<Vec<DiscordCommandOptionChoice>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DiscordCommandOptionChoice {
    pub name: String,
    pub value: String,
}
