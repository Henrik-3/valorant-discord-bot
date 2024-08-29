use clap::Parser;
use dotenv::dotenv;
use env_logger;
use lazy_static::lazy_static;
use log::{error, warn};
use mongodb::{bson::doc, Client as MongoClient};
use serde::de::DeserializeOwned;
use serenity::{
    all::{CommandOptionType, Interaction, OnlineStatus},
    async_trait,
    builder::{CreateCommand, CreateCommandOption},
    futures::StreamExt,
    gateway::ActivityData,
    model::{application::Command, Permissions},
    prelude::*,
};
use std::{
    env,
    sync::{Arc, Mutex},
};
use ab_glyph::FontRef;
use mongodb::options::ReturnDocument;
use structs::database::{CommandEntry, Settings, TranslationEntry};
use valorant_assets_api::models::language::Language;

mod commands;
mod methods;
mod structs;
mod jobs;

lazy_static! {
    static ref FONT_TUNGSTON: RwLock<Vec<u8>> = RwLock::new(include_bytes!("assets/fonts/new/Tungsten-Bold_Web.ttf").to_vec());
    static ref MARK_PRO: RwLock<Vec<u8>> = RwLock::new(include_bytes!("assets/fonts/new/MarkPro-Bold.ttf").to_vec());
    static ref READY: RwLock<bool> = RwLock::new(false);
    static ref ENVIRONMENT: String = {
        let cli = Cli::parse();
        cli.environment.unwrap_or_else(|| {
                if cfg!(warn_assertions) {
                    "CANARY".to_string()
                } else {
                    "PROD".to_string()
                }
            })
    };
    static ref TRANSLATIONS: Arc<RwLock<Vec<structs::database::TranslationEntry>>> =
        Arc::new(RwLock::new(vec![]));
}

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[arg(long)]
    environment: Option<String>,
    #[arg(short)]
    deploy: Option<bool>,
}
struct Handler {
    db: MongoClient,
}

#[async_trait]
impl EventHandler for Handler {
    async fn ready(&self, ctx: Context, ready: serenity::all::Ready) {
        println!(
            "Shard {}/{} is ready!",
            match ready.shard {
                Some(v) => v.id.0,
                None => 0,
            },
            ready.shard.unwrap().total - 1,
        );
        let activity = ActivityData::competing(format!("VALORANT | Canary Build | Rust Rewrite"));
        ctx.set_presence(Some(activity), OnlineStatus::Online)
    }
    async fn interaction_create(&self, ctx: Context, interaction: serenity::all::Interaction) {
        if let Interaction::Command(command) = interaction {
            let name = command.data.name.as_str();
            let ephemeral_commands = ["autoroles", "settings", "private", "link"];
            if ephemeral_commands.contains(&name) {
                command
                    .defer_ephemeral(&ctx.http)
                    .await
                    .expect("[ERROR][SLASH_COMMAND] Defer Ephemeral");
            } else {
                command
                    .defer(&ctx.http)
                    .await
                    .expect("[ERROR][SLASH_COMMAND] Defer");
            };
            let guild_data =
                get_settings(&self.db, command.guild_id.unwrap().to_string().as_str()).await;
            match name {
                "shard-restart" => {
                    let options = command.data.options();
                    let shard_id = options.iter().find(|x| x.name == "shard_id");
                    warn!("[SHARD-RESTART] Shard ID: {:?}", shard_id);
                }
                "agent" => {
                    commands::slash_commands::agent::execute(command, ctx, guild_data).await;
                }
                _ => {
                    error!("[INVALID COMMAND] {:?}", command.data.name.as_str())
                }
            }
        }
    }
}

pub fn get_db<T: DeserializeOwned + Send + Sync>(
    client: &MongoClient,
    collection: &str,
    db: Option<&str>,
) -> mongodb::Collection<T> {
    let db = db.unwrap_or_else(|| {
        if cfg!(debug_assertions) {
            "ValorantLabsDev"
        } else {
            "ValorantLabsDev"
        }
    });
    warn!("DB: {}", db);
    client.database(db).collection::<T>(collection)
}
pub async fn get_settings(client: &MongoClient, guild: &str) -> Settings {
    let db = get_db::<Settings>(client, "settings", None)
        .find_one_and_update(
            doc! {
                "guild": guild
            },
            doc! {
                "$setOnInsert": {
                    "language": "en",
                    "channels": {
                        "game_news": null,
                        "other_news": null,
                        "server_status": null
                    },
                    "backgrounds": {
                        "stats": null,
                        "game": null,
                        "mmr": null
                    },
                    "autoroles": {
                        "type": "simple",
                        "config": []
                    }
                }
            },
        )
        .upsert(true)
        .return_document(ReturnDocument::After)
        .await
        .expect("[ERROR][SLASH_COMMAND] Guild Data");
    warn!("Guild Data: {:?}", db);
    db.unwrap()
}
pub fn get_valo_papi_language(language: &str) -> Language {
    match language {
        "en-gb" => Language::EnUs,
        "en-us" => Language::EnUs,
        "de" => Language::DeDe,
        "jp" => Language::JaJp,
        "pt-br" => Language::PtBr,
        "fr" => Language::FrFr,
        "es" => Language::EsEs,
        "vi" => Language::ViVn,
        "pl" => Language::PlPl,
        "it" => Language::ItIt,
        "tr" => Language::TrTr,
        _ => Language::EnUs,
    }
}
pub async fn get_translation(name: &str, language: &str) -> String {
    let mut new_name = format!("bot.{}.", language);
    new_name.push_str(name);
    let translation = TRANSLATIONS.read().await;
    let translation_clone = translation.iter().find(|x| x.language == language).clone();
    if translation_clone.is_none() {
        return new_name.to_string();
    };
    let current_translation_value = &serde_json::to_value(translation_clone).ok().unwrap();
    let mut current_translation = current_translation_value.as_object();
    for translation_key in new_name.split('.') {
        let field = current_translation.unwrap().get(translation_key);
        if field.is_some() {
            if field.unwrap().is_string() {
                return field.unwrap().as_str().unwrap().to_string();
            }
            if field.unwrap().is_object() {
                current_translation = field.unwrap().as_object();
            }
        } else {
            return name.to_string();
        }
    }
    name.to_string()
}
pub async fn set_translations(translations: Vec<TranslationEntry>) {
    let mut translation = TRANSLATIONS.write().await;
    *translation = translations;
}
pub async fn set_ready() {
    let mut ready = READY.write().await;
    *ready = true;
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    if cfg!(warn_assertions) {
        env_logger::init_from_env(env_logger::Env::new().default_filter_or("warn"));
    } else {
        env_logger::init_from_env(env_logger::Env::new().default_filter_or("warn"));
    }

    /*//Test
    structs::test::draw_blur().await;
    return;*/

    // Login with a bot token from the environment
    let token = env::var("CANARY").expect("token");
    let intents = GatewayIntents::non_privileged() | GatewayIntents::MESSAGE_CONTENT;

    warn!("[MONGO_DB] Init MongoDB");
    let mongo_client = MongoClient::with_uri_str(env::var("MONGO_DB").unwrap())
        .await
        .expect("failed to connect");

    let mut client = Client::builder(token, intents)
        .event_handler(Handler {
            db: mongo_client.clone(),
        })
        .await
        .expect("Error creating client");

    let cli = Cli::parse();
    if cli.deploy.is_some() {
        warn!("[DEPLOY] Deploying");
        let db = get_db::<CommandEntry>(&mongo_client, "commands", None)
            .find(
                doc! {
                    "enabled_for.builds": {"$in": ENVIRONMENT.as_str()}
                },
            )
            .await;
        let collected = match db {
            Ok(v) => {
                v.map(|x| {
                    let command: structs::database::CommandEntry = x.unwrap();
                    let mut command_builder = CreateCommand::new(command.command.name);
                    command_builder = command_builder.description(command.command.description);
                    if command.command.default_member_permissions.is_some() {
                        let permissions = Permissions::from_bits(
                            command
                                .command
                                .default_member_permissions
                                .unwrap()
                                .parse()
                                .unwrap(),
                        )
                        .expect("Invalid permissions");
                        command_builder = command_builder.default_member_permissions(permissions);
                    }
                    command_builder = command_builder.set_options(
                        command
                            .command
                            .options
                            .iter()
                            .map(|y| {
                                let mut option_builder = CreateCommandOption::new(
                                    match y.type_ {
                                        1 => CommandOptionType::SubCommand,
                                        2 => CommandOptionType::SubCommandGroup,
                                        3 => CommandOptionType::String,
                                        4 => CommandOptionType::Integer,
                                        5 => CommandOptionType::Boolean,
                                        6 => CommandOptionType::User,
                                        7 => CommandOptionType::Channel,
                                        8 => CommandOptionType::Role,
                                        9 => CommandOptionType::Mentionable,
                                        _ => CommandOptionType::Role,
                                    },
                                    y.name.clone(),
                                    y.description.clone(),
                                );
                                option_builder = option_builder.required(y.required);
                                if y.choices.is_some() {
                                    y.choices.as_ref().unwrap().iter().for_each(|f| {
                                        option_builder = option_builder
                                            .clone()
                                            .add_string_choice(f.name.clone(), f.value.clone());
                                    });
                                }
                                option_builder
                            })
                            .collect::<Vec<_>>(),
                    );
                    command_builder
                })
                .collect::<Vec<_>>()
                .await
            }
            Err(e) => {
                error!("[DEPLOY] Error: {:?}", e);
                vec![]
            }
        };
        Command::set_global_commands(&client.http, collected)
            .await
            .unwrap();
        warn!("[DEPLOY] Deployed");
    };
    let translations_db = get_db::<TranslationEntry>(&mongo_client, "translations", None)
        .find(doc! {})
        .await;
    set_translations(
        translations_db
            .unwrap()
            .map(|x| x.unwrap())
            .collect::<Vec<_>>()
            .await,
    ).await;
    set_ready().await;
    warn!("[TRANSLATIONS] Translations loaded");

    //Jobs
    tokio::spawn(jobs::agent::build_agent_images_job());

    if let Err(why) = client.start_autosharded().await {
        println!("An error occurred while running the client: {:?}", why);
    }
}