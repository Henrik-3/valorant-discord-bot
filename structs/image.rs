use ab_glyph::{FontRef, PxScale};
use image::{GenericImageView, ImageBuffer, Rgba, RgbaImage};
use imageproc::drawing::{draw_filled_circle_mut, draw_filled_rect_mut, draw_text, draw_text_mut};
use imageproc::filter::gaussian_blur_f32;
use imageproc::rect::Rect;
use crate::FONT_TUNGSTON;

pub async fn draw_blur() {
    let mut img = image::open("./test/ProdRedBlur.png").expect("Failed to open input image");
    let mut img = img.to_rgba8();

    // Define the region to blur
    create_enhanced_blur(&mut img, 300, 1450, 450, 400, 15, 30.0);
    create_enhanced_blur(&mut img, 800, 1450, 450, 400, 15, 30.0);
    create_enhanced_blur(&mut img, 1300, 1450, 450, 400, 15, 30.0);
    create_enhanced_blur(&mut img, 1800, 1450, 450, 400, 15, 30.0);

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
    draw_text_mut(&mut img, Rgba([255, 0, 0, 255]), 300, 500, PxScale {
        x: 250.0,
        y: 250.0,
    }, &font, "//");
    draw_text_mut(&mut img, Rgba([255, 255, 255, 255]), 450, 500, PxScale {
        x: 250.0,
        y: 250.0,
    }, &font, "Brimstone");

    // Save the output image
    img.save("./test/output_3.png").expect("Failed to save output image");
}

pub fn draw_rounded_rect(mask: &mut RgbaImage, width: i32, height: i32, radius: i32) {
    let color = Rgba([255, 255, 255, 255]);

    // Draw filled circles for the corners
    draw_filled_circle_mut(mask, (radius, radius), radius, color);
    draw_filled_circle_mut(mask, (width - radius - 1, radius), radius, color);
    draw_filled_circle_mut(mask, (radius, height - radius - 1), radius, color);
    draw_filled_circle_mut(mask, (width - radius - 1, height - radius - 1), radius, color);

    // Draw filled rectangles to complete the rounded rectangle
    draw_filled_rect_mut(mask, Rect::at(radius, 0).of_size((width - 2 * radius) as u32, radius as u32), color);
    draw_filled_rect_mut(mask, Rect::at(0, radius).of_size(width as u32, (height - 2 * radius) as u32), color);
    draw_filled_rect_mut(mask, Rect::at(radius, height - radius).of_size((width - 2 * radius) as u32, radius as u32), color);
}

pub fn create_rectangle_colored(width: u32, height: u32, color: Rgba<u8>) -> RgbaImage {
    // Create a new image buffer and fill it with the specified color
    let mut img = ImageBuffer::new(width, height);
    for y in 0..height {
        for x in 0..width {
            img.put_pixel(x, y, color);
        }
    }
    img
}

pub fn create_blur_with_colored_rectangle(img: &mut RgbaImage, x: i32, y: i32, width: u32, height: u32, color: Rgba<u8>) {
    let blur_region = Rect::at(x, y).of_size(width, height);
    let radius = 15;

    // Create a new rectangle with the given color
    let colored_rectangle = create_rectangle_colored(blur_region.width(), blur_region.height(), color);

    // Apply the blur to the colored rectangle
    let blurred_colored_rectangle = gaussian_blur_f32(&colored_rectangle, 15.0_f32);

    // Create a mask with rounded corners
    let mut mask = ImageBuffer::from_pixel(blur_region.width(), blur_region.height(), Rgba([255, 255, 255, 0]));
    draw_rounded_rect(&mut mask, blur_region.width() as i32, blur_region.height() as i32, radius);

    // Composite the blurred colored rectangle with the original image using the mask
    for y in 0..blurred_colored_rectangle.height() {
        for x in 0..blurred_colored_rectangle.width() {
            let mask_pixel = mask.get_pixel(x, y);
            if mask_pixel[0] > 0 {
                let blurred_pixel = blurred_colored_rectangle.get_pixel(x, y);
                img.put_pixel(x + blur_region.left() as u32, y + blur_region.top() as u32, *blurred_pixel);
            }
        }
    }
}

pub fn create_blur(img: &mut RgbaImage, x: i32, y: i32, width: u32, height: u32) {
    let blur_region = Rect::at(x, y).of_size(width, height);
    let radius = 15;

    // Create a mask with rounded corners
    let sub_image = img.view(blur_region.left() as u32, blur_region.top() as u32, blur_region.width(), blur_region.height()).to_image();

    // Extract the region to blur
    let sub_image = gaussian_blur_f32(&sub_image, 50.0_f32);

    let mut mask = ImageBuffer::from_pixel(blur_region.width(), blur_region.height(), Rgba([255, 255, 255, 0]));
    draw_rounded_rect(&mut mask, blur_region.width() as i32, blur_region.height() as i32, radius);

    // Composite the blurred region with the original image using the mask
    for y in 0..sub_image.height() {
        for x in 0..sub_image.width() {
            let mask_pixel = mask.get_pixel(x, y);
            if mask_pixel[0] > 0 {
                let pixel = sub_image.get_pixel(x, y);
                img.put_pixel(x + blur_region.left() as u32, y + blur_region.top() as u32, *pixel);
            }
        }
    }
}

pub fn create_enhanced_blur(img: &mut RgbaImage, x: i32, y: i32, width: u32, height: u32, radius: i32, blur_strength: f32) {
    let blur_region = Rect::at(x, y).of_size(width, height);

    // Create a new rectangle with the given color
    let mut sub_image = img.view(blur_region.left() as u32, blur_region.top() as u32, blur_region.width(), blur_region.height()).to_image();

    // Optionally enhance brightness before applying blur
    for pixel in sub_image.pixels_mut() {
        pixel.0[0] = (pixel.0[0] as f32 * 1.2).min(255.0) as u8;
        pixel.0[1] = (pixel.0[1] as f32 * 1.2).min(255.0) as u8;
        pixel.0[2] = (pixel.0[2] as f32 * 1.2).min(255.0) as u8;
    }

    // Apply the blur to the colored rectangle
    let blurred_colored_rectangle = gaussian_blur_f32(&sub_image, blur_strength);

    // Create a mask with rounded corners
    let mut mask = ImageBuffer::from_pixel(blur_region.width(), blur_region.height(), Rgba([0, 0, 0, 0]));
    draw_rounded_rect(&mut mask, blur_region.width() as i32, blur_region.height() as i32, radius);

    // Composite the blurred colored rectangle with the original image using the mask
    for y in 0..blurred_colored_rectangle.height() {
        for x in 0..blurred_colored_rectangle.width() {
            let mask_pixel = mask.get_pixel(x, y);
            if mask_pixel[0] > 0 || mask_pixel[1] > 0 || mask_pixel[2] > 0 || mask_pixel[3] > 0 {
                let blurred_pixel = blurred_colored_rectangle.get_pixel(x, y);
                img.put_pixel(x + blur_region.left() as u32, y + blur_region.top() as u32, *blurred_pixel);
            }
        }
    }
}

pub fn create_enhanced_blur_with_color(img: &mut RgbaImage, x: i32, y: i32, width: u32, height: u32, radius: i32, blur_strength: f32, overlay_color: Rgba<u8>) {
    let blur_region = Rect::at(x, y).of_size(width, height);

    // Create a new rectangle with the given color
    let mut sub_image = img.view(blur_region.left() as u32, blur_region.top() as u32, blur_region.width(), blur_region.height()).to_image();

    // Optionally enhance brightness before applying blur
    for pixel in sub_image.pixels_mut() {
        pixel.0[0] = (pixel.0[0] as f32 * 1.2).min(255.0) as u8;
        pixel.0[1] = (pixel.0[1] as f32 * 1.2).min(255.0) as u8;
        pixel.0[2] = (pixel.0[2] as f32 * 1.2).min(255.0) as u8;
    }

    // Apply the blur to the colored rectangle
    let blurred_colored_rectangle = gaussian_blur_f32(&sub_image, blur_strength);

    // Create a mask with rounded corners
    let mut mask = ImageBuffer::from_pixel(blur_region.width(), blur_region.height(), Rgba([0, 0, 0, 0]));
    draw_rounded_rect(&mut mask, blur_region.width() as i32, blur_region.height() as i32, radius);

    // Composite the blurred colored rectangle with the original image using the mask
    for y in 0..blurred_colored_rectangle.height() {
        for x in 0..blurred_colored_rectangle.width() {
            let mask_pixel = mask.get_pixel(x, y);
            if mask_pixel[0] > 0 || mask_pixel[1] > 0 || mask_pixel[2] > 0 || mask_pixel[3] > 0 {
                let blurred_pixel = blurred_colored_rectangle.get_pixel(x, y);
                img.put_pixel(x + blur_region.left() as u32, y + blur_region.top() as u32, *blurred_pixel);
            }
        }
    }

    // Optionally overlay a semi-transparent layer for contrast
    for y in 0..blurred_colored_rectangle.height() {
        for x in 0..blurred_colored_rectangle.width() {
            if mask.get_pixel(x, y)[3] > 0 { // Apply only within the mask area
                let existing_pixel = img.get_pixel_mut(x + blur_region.left() as u32, y + blur_region.top() as u32);
                *existing_pixel = blend_pixels(*existing_pixel, overlay_color);
            }
        }
    }
}

pub fn blend_pixels(bottom: Rgba<u8>, top: Rgba<u8>) -> Rgba<u8> {
    let alpha = top[3] as f32 / 255.0;
    let inv_alpha = 1.0 - alpha;

    Rgba([
        (top[0] as f32 * alpha + bottom[0] as f32 * inv_alpha) as u8,
        (top[1] as f32 * alpha + bottom[1] as f32 * inv_alpha) as u8,
        (top[2] as f32 * alpha + bottom[2] as f32 * inv_alpha) as u8,
        255,
    ])
}

pub fn create_3d_effect(img: &RgbaImage, offset_x: u32, offset_y: u32, color: Rgba<u8>) -> RgbaImage {
    let (width, height) = img.dimensions();

    // Create a new image with the same dimensions, but larger to accommodate the offset
    let mut new_img = ImageBuffer::new(width + offset_x, height + offset_y);

    // Apply a red layer to the original image
    let mut red_tinted_img = img.clone();
    apply_color_layer(&mut red_tinted_img, color); // Semi-transparent red layer

    // Draw the red-tinted image with an offset to create the 3D effect
    image::imageops::overlay(&mut new_img, &red_tinted_img, offset_x as i64, offset_y as i64);

    // Draw the original image on top of the red-tinted image without offset
    image::imageops::overlay(&mut new_img, img, 0, 0);

    new_img
}

pub fn apply_color_layer(img: &mut RgbaImage, color: Rgba<u8>) {
    for pixel in img.pixels_mut() {
        if pixel.0[3] == 0 {
            continue;
        }
        *pixel = blend_pixels(*pixel, color);
    }
}