use poise::CreateReply;
use crate::{get_translation, structs::methods::EmbedBuilderStruct, Context};
use super::embed_builder::embed_builder;

pub async fn http_error_handler(
    ctx: &Context<'_>,
    language: &str,
    status: &u16,
) {
    let title = get_translation(&format!("response.{}.title", status.to_string()), language).await;
    let description = get_translation(
        &format!("response.{}.description", status.to_string()),
        language,
    ).await;
    let c_user = ctx.cache().current_user().clone();
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
            client: c_user,
            ..Default::default()
        });
        let build = CreateReply::default().embed(embed);
        let _ = ctx.send(build).await;
        return;
    }
    let embed = embed_builder(EmbedBuilderStruct {
        title: Some(title),
        description: Some(description),
        client: c_user,
        ..Default::default()
    });
    let build = CreateReply::default().embed(embed);
    let _ = ctx.send(build).await;
}
