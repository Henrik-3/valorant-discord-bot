use crate::{
    get_translation, get_valo_papi_language,
    methods::{embed_builder::embed_builder, http_error_handler::http_error_handler},
    structs::{database::Settings, methods::EmbedBuilderStruct},
};
use serenity::{all::CommandInteraction, builder::EditInteractionResponse, client::Context};
use valorant_assets_api::{agents::get_agents, models::agent::AgentAbilitySlot};

pub async fn execute(command: CommandInteraction, ctx: Context, guild_data: Settings) {
    let client = reqwest::Client::new();
    let f_agents = get_agents(
        &client,
        Some(get_valo_papi_language(&guild_data.language)),
        Some(true),
    )
    .await;
    ctx.cache.current_user();
    if f_agents.is_err() {
        let status = f_agents.unwrap_err().status().unwrap().as_u16();
        http_error_handler(command, &ctx, &guild_data.language, &status).await;
        return;
    }
    let agents = f_agents.unwrap();
    let agent = agents.iter().find(|x| {
        x.uuid.to_string()
            == command
                .data
                .options
                .iter()
                .find(|k| k.name == "agent")
                .unwrap()
                .value
                .as_str()
                .unwrap()
    });
    if agent.is_none() {
        let embed = embed_builder(EmbedBuilderStruct {
            title: Some(get_translation("agent.unknown.title", &guild_data.language).await),
            description: Some(get_translation(
                "agent.unknown.description",
                &guild_data.language,
            ).await),
            client: ctx.cache.current_user().clone(),
            ..Default::default()
        });
        let _ = command
            .edit_response(&ctx.http, EditInteractionResponse::new().add_embed(embed))
            .await;
        return;
    }
    let a1 = agent
        .unwrap()
        .abilities
        .iter()
        .find(|x| x.slot == AgentAbilitySlot::Ability1);
    let a2 = agent
        .unwrap()
        .abilities
        .iter()
        .find(|x| x.slot == AgentAbilitySlot::Ability2);
    let a3 = agent
        .unwrap()
        .abilities
        .iter()
        .find(|x| x.slot == AgentAbilitySlot::Grenade);
    let ult = agent
        .unwrap()
        .abilities
        .iter()
        .find(|x| x.slot == AgentAbilitySlot::Ultimate);
}
