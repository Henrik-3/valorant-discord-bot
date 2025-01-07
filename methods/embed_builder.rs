use serenity::builder::{CreateEmbed, CreateEmbedFooter};

use crate::structs::methods::EmbedBuilderStruct;

pub fn embed_builder(data: EmbedBuilderStruct) -> CreateEmbed {
    let footer = CreateEmbedFooter::new(&data.client.name)
        .icon_url(data.client.avatar_url().unwrap_or_default());
    let mut embed = CreateEmbed::default().footer(footer);
    if data.title.is_some() {
        embed = embed.title(data.title.unwrap());
    }
    if data.description.is_some() {
        embed = embed.description(data.description.unwrap());
    }
    if data.url.is_some() {
        embed = embed.url(data.url.unwrap());
    }
    if data.color.is_some() {
        let dec = u64::from_str_radix(data.color.unwrap().as_str(), 16).unwrap();
        embed = embed.color(dec);
    }
    embed
}
