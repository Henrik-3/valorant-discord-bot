use std::fmt::format;
use ab_glyph::{FontRef, PxScale};
use image::Rgba;
use imageproc::drawing::{draw_text_mut, text_size};
use valorant_assets_api::models::agent::{Agent, AgentAbilitySlot};
use valorant_assets_api::models::language::Language;
use crate::{FONT_TUNGSTON, MARK_PRO, TRANSLATIONS};
use crate::structs::http_clients::fetch;
use crate::structs::image::{create_3d_effect, create_enhanced_blur, create_enhanced_blur_with_color, pick_text_color_based_on_bg_color_simple};
use crate::structs::methods::{get_officer_from_lang, hex_with_opacity_to_rgba};

pub async fn build_agent_images_job() {
    loop {
        println!("[JOBS] Building agent images");
        build_agent_images().await;
        println!("[JOBS] Finished building agent images");
        tokio::time::sleep(tokio::time::Duration::from_secs(60 * 60)).await;
    }
}

pub async fn build_agent_images() {
    let client = reqwest::Client::new();
    let all_languages = TRANSLATIONS.read().await;
    let font_tungston_slice = FONT_TUNGSTON.read().await;
    let font_tungston = FontRef::try_from_slice(font_tungston_slice.as_ref()).expect("Failed to load font");
    let font_mark_pro_slice = MARK_PRO.read().await;
    let font_mark_pro = FontRef::try_from_slice(font_mark_pro_slice.as_ref()).expect("Failed to load font");

    let img = image::open("./assets/background/ProdRedBlur.png").expect("Failed to open input image");

    for language in all_languages.iter() {
        let all_agents = valorant_assets_api::agents::get_agents(&client, Some(get_officer_from_lang(&language.officer)), Some(true)).await.    expect("Failed to fetch agents");
        for agent in all_agents {
            let mut img_ = img.clone().to_rgba8();

            // Define the region to blur
            let x = vec![300, 800, 1300, 1800];
            let abilities = vec!["Q", "E", "C", "X"];
            let agent_hex = hex_with_opacity_to_rgba(agent.background_gradient_colors[0].as_str());
            for (index, i) in x.iter().enumerate() {
                if index == x.len() - 1 {
                    let mut hex = agent_hex.clone();
                    hex[3] = 200;
                    create_enhanced_blur_with_color(&mut img_, i.clone(), 1450, 450, 400, 15, 30.0, hex);
                    break;
                }
                create_enhanced_blur(&mut img_, i.clone(), 1450, 450, 400, 15, 30.0);
            }

            //Agent
            let agent_portrait = reqwest::get(agent.full_portrait_v2.unwrap_or(agent.full_portrait.unwrap())).await.expect("Failed to fetch agent image");
            let agent_portrait = image::load_from_memory(&agent_portrait.bytes().await.expect("Failed to fetch agent image").to_vec()).expect("Failed to open input image");
            let agent_portrait = agent_portrait.to_rgba8();
            //rescale
            let img_agent = image::imageops::resize(&agent_portrait, (agent_portrait.width() as f64 * 1.1) as u32, (agent_portrait.height() as f64 * 1.1) as u32, image::imageops::FilterType::Lanczos3);
            let agent_3d = create_3d_effect(&img_agent, 15, 15, agent_hex);
            image::imageops::overlay(&mut img_, &agent_3d, 1950, 0);

            //Font
            draw_text_mut(&mut img_, Rgba([255, 0, 0, 255]), 300, 350, PxScale {
                x: 300.0,
                y: 300.0,
            }, &font_tungston, "//");
            let display_name_text_size = text_size(PxScale {
                x: 300.0,
                y: 300.0,
            }, &font_tungston, agent.display_name.as_str());
            draw_text_mut(&mut img_, Rgba([255, 255, 255, 255]), 450, 350, PxScale {
                x: 300.0,
                y: 300.0,
            }, &font_tungston, agent.display_name.as_str());
            draw_text_mut(&mut img_, Rgba([125, 125, 125, 255]), 300, 650, PxScale {
                x: 125.0,
                y: 125.0,
            }, &font_tungston, agent.developer_name.as_str());

            //get agent release date
            let agent_release_v = crate::structs::metadata::AGENT_RELEASE_VERSIONS.get(agent.uuid.to_string().as_str()).unwrap_or(&"-");
            //draw release date with format
            draw_text_mut(&mut img_, Rgba([125, 125, 125, 255]), 300, 200, PxScale {
                x: 150.0,
                y: 150.0,
            }, &font_tungston, &agent_release_v);

            for (i, ability) in agent.abilities.iter().filter(|i| i.slot != AgentAbilitySlot::Passive).enumerate() {
                //draw ability icon and name
                if ability.display_icon.is_none() {
                    continue;
                }
                let ability_icon = reqwest::get(ability.display_icon.clone().unwrap()).await.expect("Failed to fetch ability icon");
                let ability_icon = image::load_from_memory(&ability_icon.bytes().await.expect("Failed to fetch ability icon").to_vec()).expect("Failed to open input image");
                let ability_icon = ability_icon.to_rgba8();
                let ability_icon = image::imageops::resize(&ability_icon, 200, 200, image::imageops::FilterType::Lanczos3);

                let x_mid = x[i] as i64 + (450 / 2);
                image::imageops::overlay(&mut img_, &ability_icon, x_mid - (ability_icon.width() / 2) as i64, 1500);

                let mut text = 80.0;
                let mut text_length_drawn = text_size(PxScale {
                    x: text,
                    y: text,
                }, &font_mark_pro, ability.display_name.as_str());
                //make text smaller if it's too long
                loop {
                    text_length_drawn = text_size(PxScale {
                        x: text - 10.0,
                        y: text - 10.0,
                    }, &font_mark_pro, ability.display_name.as_str());
                    text -= 10.0;
                    if text_length_drawn.0 <= 450 {
                        text_length_drawn = text_size(PxScale {
                            x: text - 10.0,
                            y: text - 10.0,
                        }, &font_mark_pro, ability.display_name.as_str());
                        text -= 10.0;
                        break;
                    }
                }
                draw_text_mut(&mut img_, if i == 4 {
                    pick_text_color_based_on_bg_color_simple(agent_hex, None, None)
                } else {
                    Rgba([225, 255, 255, 255])
                }, (x_mid - text_length_drawn.0 as i64 / 2) as i32, 1750, PxScale {
                    x: text,
                    y: text,
                }, &font_mark_pro, ability.display_name.as_str());

                let text_length_ability = text_size(PxScale {
                    x: 100.0,
                    y: 100.0,
                }, &font_mark_pro, abilities[i]);
                draw_text_mut(&mut img_, Rgba([255, 255, 255, 255]), (x_mid - text_length_ability.0 as i64 / 2) as i32, 1925, PxScale {
                    x: 100.0,
                    y: 100.0,
                }, &font_mark_pro, abilities[i]);
            }

            let mut response = reqwest::get(agent.role.unwrap().display_icon).await.expect("Failed to fetch agent image");
            let mut img_agent = image::load_from_memory(&response.bytes().await.expect("Failed to fetch agent image").to_vec()).expect("Failed to open input image");
            let img_agent = img_agent.to_rgba8();

            image::imageops::overlay(&mut img_, &img_agent, 450 + display_name_text_size.0 as i64 + 40, 325 + img_agent.height() as i64);

            // Save the output image
            //create folders if not exist
            std::fs::create_dir_all(format!("./assets/agents/{}", language.officer.to_string())).expect("Failed to create output image folder");
            img_.save(format!("./assets/agents/{}/{}.png", language.officer.to_string(), agent.uuid.to_string())).expect("Failed to save output image");
            println!("[JOBS] Built agent image for {} in {}", agent.display_name, language.officer);
        }
    }
}