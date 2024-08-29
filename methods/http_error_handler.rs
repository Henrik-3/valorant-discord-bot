use serenity::{all::CommandInteraction, builder::EditInteractionResponse, client::Context};

use crate::{get_translation, structs::methods::EmbedBuilderStruct};

use super::embed_builder::embed_builder;

pub async fn http_error_handler(
    command: CommandInteraction,
    ctx: &Context,
    language: &str,
    status: &u16,
) {
    let title = get_translation(&format!("response.{}.title", status.to_string()), language).await;
    let description = get_translation(
        &format!("response.{}.description", status.to_string()),
        language,
    ).await;
    if title == format!("response.{}.title", status.to_string()) {
        let embed = embed_builder(EmbedBuilderStruct {
            title: Some(get_translation(
                &format!("response.{}.title", "500"),
                language,
            ).await),
            description: Some(get_translation(
                &format!("response.{}.description", "500"),
                language,
            ).await),
            client: ctx.cache.current_user().clone(),
            ..Default::default()
        });
        let build = EditInteractionResponse::new().add_embed(embed);
        let _ = command.edit_response(&ctx.http, build).await;
        return;
    }
    let embed = embed_builder(EmbedBuilderStruct {
        title: Some(title),
        description: Some(description),
        client: ctx.cache.current_user().clone(),
        ..Default::default()
    });
    let build = EditInteractionResponse::new().add_embed(embed);
    let _ = command.edit_response(&ctx.http, build).await;
}
