use ab_glyph::{FontRef, PxScale};
use chrono::{DateTime, Utc};
use image::{GenericImageView, Rgba};
use imageproc::drawing::{draw_text_mut, text_size};
use crate::FONT_TUNGSTON;
use crate::structs::image::{create_3d_effect, create_enhanced_blur};

pub async fn draw_blur() {
    let mut img = image::open("./test/ProdRedBlur.png").expect("Failed to open input image");
    let mut img = img.to_rgba8();

    // Define the region to blur
    let x = vec![300, 800, 1300, 1800];
    for i in x {
        create_enhanced_blur(&mut img, i, 350, 450, 400, 15, 30.0);
    }

    //Agent
    let mut img_agent = image::open("./test/fullportrait.png").expect("Failed to open input image");
    let img_agent = img_agent.to_rgba8();
    //rescale
    let img_agent = image::imageops::resize(&img_agent, (img_agent.width() as f64 * 1.25) as u32, (img_agent.height() as f64 * 1.25) as u32, image::imageops::FilterType::Lanczos3);
    let agent_3d = create_3d_effect(&img_agent, 15, 15, Rgba([255, 0, 0, 150]));
    image::imageops::overlay(&mut img, &agent_3d, 1750, -200);

    //Font
    let font_slice = FONT_TUNGSTON.read().await;
    let font = FontRef::try_from_slice(font_slice.as_ref()).expect("Failed to load font");
    draw_text_mut(&mut img, Rgba([255, 0, 0, 255]), 300, 350, PxScale {
        x: 300.0,
        y: 300.0,
    }, &font, "//");
    draw_text_mut(&mut img, Rgba([255, 255, 255, 255]), 450, 350, PxScale {
        x: 300.0,
        y: 300.0,
    }, &font, "Brimstone");
    draw_text_mut(&mut img, Rgba([125, 125, 125, 255]), 300, 650, PxScale {
        x: 125.0,
        y: 125.0,
    }, &font, "Aggrobot");

    //get agent release date
    let agent_release_date = crate::structs::metadata::AGENT_RELEASE_VERSIONS.get("e370fa57-4757-3604-3648-499e1f642d3f").unwrap();
    //draw release date with format
    draw_text_mut(&mut img, Rgba([125, 125, 125, 255]), 300, 200, PxScale {
        x: 150.0,
        y: 150.0,
    }, &font, &agent_release_date);

    //fetch agent image from valorant-api.com using reqwest and put it to rgba8
    let mut response = reqwest::get("https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png").await.expect("Failed to fetch agent image");
    let mut img_agent = image::load_from_memory(&response.bytes().await.expect("Failed to fetch agent image").to_vec()).expect("Failed to open input image");
    let img_agent = img_agent.to_rgba8();

    text_size(PxScale {
        x: 300.0,
        y: 300.0,
    }, &font, "//",);
    image::imageops::overlay(&mut img, &img_agent, 1250, 350 + img_agent.height() as i64);

    // Save the output image
    img.save("./test/output_3.png").expect("Failed to save output image");
}