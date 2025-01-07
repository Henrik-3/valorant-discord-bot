use std::ops::Deref;
use poise::CreateReply;
use crate::{get_translation, get_valo_papi_language, methods::{embed_builder::embed_builder, http_error_handler::http_error_handler}, structs::{database::Settings, methods::EmbedBuilderStruct}, Context, Error, InvocationData};
use serenity::{all::CommandInteraction, builder::EditInteractionResponse};
use serenity::all::{CreateActionRow, CreateAttachment, CreateButton};
use valorant_assets_api::{agents::get_agents, models::agent::AgentAbilitySlot};

#[poise::command(slash_command, rename = "api")]
pub async fn execute(
    ctx: Context<'_>,
    agent: String,
) -> Result<(), Error> {
    let guild_data = &ctx.invocation_data::<InvocationData>().await.unwrap().guild_data;
    let embed = embed_builder(EmbedBuilderStruct {
        title: Some(get_translation("api.title", &guild_data.language).await),
        description: Some(get_translation("api.description", &guild_data.language).await),
        image: Some("https://opengraph.githubassets.com/3bbac063af945bc9eed6be07446a8760a5b892eea59e7d1e515b7770ef13b6/Henrik-3/unofficial-valorant-api".to_string()),
        ..Default::default()
    });
    let new_row = CreateActionRow::Buttons(vec![CreateButton::new_link("https://github.com/Henrik-3/unofficial-valorant-api").label("GitHub")]);
    let _ = ctx.send(CreateReply::default().embed(embed).components(vec![new_row])).await;
    Ok(())
}
