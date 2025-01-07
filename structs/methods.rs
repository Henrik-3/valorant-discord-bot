use image::Rgba;
use serde::{Deserialize, Serialize};
use serenity::all::{CurrentUser, EmbedField, User};
use valorant_assets_api::models::language::Language;

#[derive(Serialize, Deserialize, Debug)]
pub struct EmbedBuilderStruct {
    pub title: Option<String>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub color: Option<String>,
    pub author: Option<User>,
    pub fields: Option<EmbedField>,
    pub thumbnail: Option<String>,
    pub image: Option<String>,
    pub client: CurrentUser,
}

impl Default for EmbedBuilderStruct {
    fn default() -> Self {
        Self {
            title: None,
            description: None,
            url: None,
            color: None,
            author: None,
            fields: None,
            thumbnail: None,
            image: None,
            client: CurrentUser::default(),
        }
    }
}

pub fn get_officer_from_lang(str: &str) -> Language {
    match str {
        "en-US" => Language::EnUs,
        "de-DE" => Language::DeDe,
        "es-ES" => Language::EsEs,
        "es-MX" => Language::EsMx,
        "fr-FR" => Language::FrFr,
        "id-ID" => Language::IdId,
        "it-IT" => Language::ItIt,
        "ja-JP" => Language::JaJp,
        "ko-KR" => Language::KoKr,
        "pl-PL" => Language::PlPl,
        "pt-BR" => Language::PtBr,
        "ru-RU" => Language::RuRu,
        "th-TH" => Language::ThTh,
        "tr-TR" => Language::TrTr,
        "vi-VN" => Language::ViVn,
        "zh-CN" => Language::ZhCn,
        "zh-TW" => Language::ZhTw,
        _ => Language::EnUs,
    }
}

pub fn hex_with_opacity_to_rgba(color: &str) -> Rgba<u8> {
    let color = color.trim_start_matches("#");
    let r = u8::from_str_radix(&color[0..2], 16).unwrap();
    let g = u8::from_str_radix(&color[2..4], 16).unwrap();
    let b = u8::from_str_radix(&color[4..6], 16).unwrap();
    let a = u8::from_str_radix(&color[6..8], 16).unwrap();
    Rgba([r, g, b, a])
}