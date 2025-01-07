use std::ops::Deref;
use poise::CreateReply;
use crate::{get_translation, get_valo_papi_language, methods::{embed_builder::embed_builder, http_error_handler::http_error_handler}, structs::{database::Settings, methods::EmbedBuilderStruct}, Context, Error, InvocationData};
use serenity::{all::CommandInteraction, builder::EditInteractionResponse};
use serenity::all::CreateAttachment;
use valorant_assets_api::{agents::get_agents, models::agent::AgentAbilitySlot};

#[poise::command(slash_command, rename = "agent")]
pub async fn execute(
    ctx: Context<'_>,
    agent: String,
) -> Result<(), Error> {
    ctx.defer().await?;
    let client = reqwest::Client::new();
    let guild_data = &ctx.invocation_data::<InvocationData>().await.unwrap().guild_data;
    let f_agents = get_agents(
        &client,
        Some(get_valo_papi_language(&guild_data.language)),
        Some(true),
    )
    .await;
    let c_user = ctx.cache().current_user().clone();
    if f_agents.is_err() {
        let status = f_agents.unwrap_err().status().unwrap().as_u16();
        http_error_handler(&ctx, &guild_data.language, &status).await;
        return Ok(());
    }
    let agents = f_agents.unwrap();
    println!("{:?}", agent);
    let agent = agents.iter().find(|x| {
        x.uuid.to_string() == agent
    });
    if agent.is_none() {
        let embed = embed_builder(EmbedBuilderStruct {
            title: Some(get_translation("agent.unknown.title", &guild_data.language).await),
            description: Some(get_translation(
                "agent.unknown.description",
                &guild_data.language,
            ).await),
            client: c_user,
            ..Default::default()
        });
        let _ = ctx.send(CreateReply::default().embed(embed)).await;
        return Ok(());
    }

    //get agent image from assets folder by language and uuid
    let agent = agent.unwrap();
    let path = format!(
        "/assets/agents/{}/{}.png",
        get_valo_papi_language(&guild_data.language),
        agent.uuid.to_string()
    );
    let image_file = tokio::fs::File::open(path).await;
    if let Ok(file) = image_file {
        let _ = ctx.send(CreateReply::default().attachment(CreateAttachment::file(&file, "agent.png").await.expect("Error while creating agent file"))).await;
    } else {
        let embed = embed_builder(EmbedBuilderStruct {
            title: Some(get_translation("agent.unknown.title", &guild_data.language).await),
            description: Some(get_translation(
                "agent.unknown.description",
                &guild_data.language,
            ).await),
            client: c_user,
            ..Default::default()
        });
        let _ = ctx.send(CreateReply::default().embed(embed)).await;
        return Ok(());
    }
    Ok(())
}
