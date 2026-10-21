//! Where a generated image is written, in which format, and the smaller copies
//! made of it: the preview the agent sees and the one the chat card shows.

use std::io::Cursor;
use std::path::{Path, PathBuf};

use base64::Engine as _;
use image::{DynamicImage, ImageFormat, ImageReader};
use serde::Serialize;

/// The formats an image is saved in.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutputFormat {
    Png,
    Jpeg,
    Webp,
}

impl OutputFormat {
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_ascii_lowercase().as_str() {
            "png" => Some(Self::Png),
            "jpg" | "jpeg" => Some(Self::Jpeg),
            "webp" => Some(Self::Webp),
            _ => None,
        }
    }

    fn from_image_format(format: ImageFormat) -> Option<Self> {
        match format {
            ImageFormat::Png => Some(Self::Png),
            ImageFormat::Jpeg => Some(Self::Jpeg),
            ImageFormat::WebP => Some(Self::Webp),
            _ => None,
        }
    }

    pub fn extension(self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpg",
            Self::Webp => "webp",
        }
    }

    pub fn mime_type(self) -> &'static str {
        match self {
            Self::Png => "image/png",
            Self::Jpeg => "image/jpeg",
            Self::Webp => "image/webp",
        }
    }

    /// The `output_format` value the OpenAI images API takes.
    pub fn api_name(self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpeg",
            Self::Webp => "webp",
        }
    }
}

/// Where an image will go: a full path when the agent named a file, or a path
/// whose extension is filled in from the image's own format.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OutputTarget {
    /// Without extension when `format` is `None`.
    pub path: PathBuf,
    pub format: Option<OutputFormat>,
}

fn expand(raw: &str, cwd: &Path) -> PathBuf {
    let path = crate::parsers::expand_home_prefix(raw, dirs::home_dir().as_ref());
    if path.is_absolute() {
        path
    } else {
        cwd.join(path)
    }
}

/// A short file name from the prompt's first words, ASCII only.
fn slug(prompt: &str) -> String {
    let words: Vec<String> = prompt
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|w| !w.is_empty())
        .take(5)
        .map(|w| w.to_ascii_lowercase())
        .collect();
    let mut slug = words.join("-");
    slug.truncate(40);
    let slug = slug.trim_end_matches('-').to_string();
    if slug.is_empty() {
        "image".to_string()
    } else {
        slug
    }
}

/// Resolve where the image goes. `output_path` relative to `cwd`; a directory,
/// or a name without an extension, gets a generated name; no path at all goes
/// to `save_root/<date>/`.
pub fn resolve_output(
    output_path: Option<&str>,
    cwd: &Path,
    save_root: &Path,
    prompt: &str,
    job_id: &str,
) -> Result<OutputTarget, String> {
    let now = chrono::Local::now();
    let short_id: String = job_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(6)
        .collect();
    let generated = format!("{}-{}-{short_id}", now.format("%H%M%S"), slug(prompt));
    let Some(raw) = output_path.map(str::trim).filter(|p| !p.is_empty()) else {
        let dir = save_root.join(now.format("%Y-%m-%d").to_string());
        return Ok(OutputTarget {
            path: dir.join(generated),
            format: None,
        });
    };
    let is_dir_like = raw.ends_with('/') || raw.ends_with('\\');
    let path = expand(raw, cwd);
    if is_dir_like || path.is_dir() {
        return Ok(OutputTarget {
            path: path.join(generated),
            format: None,
        });
    }
    match path.extension().and_then(|e| e.to_str()) {
        None => Ok(OutputTarget { path, format: None }),
        Some(ext) => match OutputFormat::from_extension(ext) {
            Some(format) => Ok(OutputTarget {
                path,
                format: Some(format),
            }),
            None => Err(format!(
                "output_path must end in .png, .jpg or .webp (got .{ext}), or name a folder"
            )),
        },
    }
}

/// A saved image, as reported back.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct SavedImage {
    pub path: PathBuf,
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
}

fn decode(bytes: &[u8]) -> Result<DynamicImage, String> {
    ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| format!("unreadable image: {e}"))?
        .decode()
        .map_err(|e| format!("unreadable image: {e}"))
}

/// Flatten transparency onto white, for formats without an alpha channel.
fn on_white(img: &DynamicImage) -> image::RgbImage {
    let rgba = img.to_rgba8();
    let mut out = image::RgbImage::new(rgba.width(), rgba.height());
    for (x, y, px) in rgba.enumerate_pixels() {
        let a = px[3] as u32;
        let blend = |c: u8| ((c as u32 * a + 255 * (255 - a)) / 255) as u8;
        out.put_pixel(x, y, image::Rgb([blend(px[0]), blend(px[1]), blend(px[2])]));
    }
    out
}

fn encode(img: &DynamicImage, format: OutputFormat) -> Result<Vec<u8>, String> {
    let mut out = Cursor::new(Vec::new());
    match format {
        OutputFormat::Png => img
            .write_to(&mut out, ImageFormat::Png)
            .map_err(|e| format!("encoding PNG failed: {e}"))?,
        OutputFormat::Jpeg => {
            let rgb = on_white(img);
            image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 90)
                .encode_image(&rgb)
                .map_err(|e| format!("encoding JPEG failed: {e}"))?
        }
        OutputFormat::Webp => {
            let rgba = img.to_rgba8();
            image::codecs::webp::WebPEncoder::new_lossless(&mut out)
                .encode(
                    rgba.as_raw(),
                    rgba.width(),
                    rgba.height(),
                    image::ExtendedColorType::Rgba8,
                )
                .map_err(|e| format!("encoding WebP failed: {e}"))?
        }
    }
    Ok(out.into_inner())
}

/// Write `bytes` to `target`, converting when the file asked for a format the
/// service did not return. Parent folders are created; an existing file is
/// replaced.
pub fn save(bytes: &[u8], target: &OutputTarget) -> Result<SavedImage, String> {
    let returned = image::guess_format(bytes)
        .ok()
        .and_then(OutputFormat::from_image_format);
    let want = target.format.or(returned).unwrap_or(OutputFormat::Png);
    let (data, width, height) = if returned == Some(want) {
        let (w, h) = ImageReader::new(Cursor::new(bytes))
            .with_guessed_format()
            .map_err(|e| format!("unreadable image: {e}"))?
            .into_dimensions()
            .map_err(|e| format!("unreadable image: {e}"))?;
        (bytes.to_vec(), w, h)
    } else {
        let img = decode(bytes)?;
        (encode(&img, want)?, img.width(), img.height())
    };
    let path = match target.format {
        Some(_) => target.path.clone(),
        None => target.path.with_extension(want.extension()),
    };
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("could not create {}: {e}", parent.display()))?;
    }
    std::fs::write(&path, &data).map_err(|e| format!("could not write {}: {e}", path.display()))?;
    Ok(SavedImage {
        path,
        width,
        height,
        mime_type: want.mime_type().to_string(),
    })
}

/// An image as base64, for a tool result or the chat card.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct EncodedImage {
    pub data: String,
    pub mime_type: String,
    pub width: u32,
    pub height: u32,
}

/// Shrink to fit `max_edge` (never enlarges) and encode: JPEG, or PNG when the
/// image has transparency worth keeping.
fn shrink(img: &DynamicImage, max_edge: u32) -> Result<EncodedImage, String> {
    let small = if img.width() > max_edge || img.height() > max_edge {
        img.thumbnail(max_edge, max_edge)
    } else {
        img.clone()
    };
    // An alpha channel alone is not transparency: services return opaque
    // images as RGBA PNGs all the time.
    let transparent = small.color().has_alpha() && small.to_rgba8().pixels().any(|px| px[3] < 255);
    let format = if transparent {
        OutputFormat::Png
    } else {
        OutputFormat::Jpeg
    };
    let bytes = match format {
        OutputFormat::Jpeg => {
            let mut out = Cursor::new(Vec::new());
            image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, 80)
                .encode_image(&on_white(&small))
                .map_err(|e| format!("encoding JPEG failed: {e}"))?;
            out.into_inner()
        }
        _ => encode(&small, OutputFormat::Png)?,
    };
    Ok(EncodedImage {
        data: base64::engine::general_purpose::STANDARD.encode(bytes),
        mime_type: format.mime_type().to_string(),
        width: small.width(),
        height: small.height(),
    })
}

/// The preview attached to the agent's tool result: 512 pixels on the longer
/// edge keeps it to a few hundred tokens.
pub fn preview(bytes: &[u8]) -> Result<EncodedImage, String> {
    shrink(&decode(bytes)?, 512)
}

/// Files above this are shown shrunk in the chat card.
const DISPLAY_MAX_BYTES: u64 = 6 * 1024 * 1024;
const DISPLAY_MAX_EDGE: u32 = 4096;
const DISPLAY_SHRINK_EDGE: u32 = 2048;

/// An image file for the chat card: as it is when it is small enough,
/// otherwise shrunk to 2048 pixels.
pub fn load_for_display(path: &Path) -> Result<EncodedImage, String> {
    let meta = std::fs::metadata(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let bytes = std::fs::read(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let format = image::guess_format(&bytes)
        .ok()
        .and_then(OutputFormat::from_image_format);
    let dims = ImageReader::new(Cursor::new(&bytes))
        .with_guessed_format()
        .ok()
        .and_then(|r| r.into_dimensions().ok());
    if let (Some(format), Some((w, h))) = (format, dims) {
        if meta.len() <= DISPLAY_MAX_BYTES && w.max(h) <= DISPLAY_MAX_EDGE {
            return Ok(EncodedImage {
                data: base64::engine::general_purpose::STANDARD.encode(&bytes),
                mime_type: format.mime_type().to_string(),
                width: w,
                height: h,
            });
        }
    }
    shrink(&decode(&bytes)?, DISPLAY_SHRINK_EDGE)
}

/// The most a reference image may weigh.
const REFERENCE_MAX_BYTES: u64 = 20 * 1024 * 1024;

/// Read a reference image the agent named.
pub fn read_reference(raw: &str, cwd: &Path) -> Result<super::providers::ReferenceImage, String> {
    let path = expand(raw.trim(), cwd);
    let meta = std::fs::metadata(&path)
        .map_err(|_| format!("reference image not found: {}", path.display()))?;
    if !meta.is_file() {
        return Err(format!("reference image is not a file: {}", path.display()));
    }
    if meta.len() > REFERENCE_MAX_BYTES {
        return Err(format!("reference image is over 20 MB: {}", path.display()));
    }
    let bytes = std::fs::read(&path).map_err(|e| format!("{}: {e}", path.display()))?;
    let mime_type = match image::guess_format(&bytes) {
        Ok(ImageFormat::Png) => "image/png",
        Ok(ImageFormat::Jpeg) => "image/jpeg",
        Ok(ImageFormat::WebP) => "image/webp",
        Ok(ImageFormat::Gif) => "image/gif",
        _ => {
            return Err(format!(
                "reference image is not a PNG, JPEG, WebP or GIF: {}",
                path.display()
            ))
        }
    };
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image")
        .to_string();
    Ok(super::providers::ReferenceImage {
        bytes,
        mime_type: mime_type.to_string(),
        file_name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn png(w: u32, h: u32, alpha: u8) -> Vec<u8> {
        let img = image::RgbaImage::from_pixel(w, h, image::Rgba([10, 200, 30, alpha]));
        let mut out = Cursor::new(Vec::new());
        img.write_to(&mut out, ImageFormat::Png).unwrap();
        out.into_inner()
    }

    #[test]
    fn output_paths_resolve_against_the_working_directory() {
        let cwd = tempfile::tempdir().unwrap();
        let root = Path::new("/images");
        let t = resolve_output(Some("public/hero.png"), cwd.path(), root, "x", "id").unwrap();
        assert_eq!(t.path, cwd.path().join("public/hero.png"));
        assert_eq!(t.format, Some(OutputFormat::Png));

        let t = resolve_output(
            Some("assets/"),
            cwd.path(),
            root,
            "A red Fox, night",
            "ab-cd12",
        )
        .unwrap();
        assert!(t.path.starts_with(cwd.path().join("assets")));
        let name = t.path.file_name().unwrap().to_str().unwrap();
        assert!(name.ends_with("-a-red-fox-night-abcd12"), "{name}");
        assert_eq!(t.format, None);

        let t = resolve_output(None, cwd.path(), root, "夜景", "id").unwrap();
        assert!(t.path.starts_with(root));
        assert!(t.path.to_str().unwrap().contains("-image-"));

        let err = resolve_output(Some("x.gif"), cwd.path(), root, "x", "id").unwrap_err();
        assert!(err.contains(".gif"), "{err}");
    }

    #[test]
    fn save_keeps_the_format_or_converts_to_the_asked_one() {
        let dir = tempfile::tempdir().unwrap();
        let bytes = png(8, 4, 255);
        let kept = save(
            &bytes,
            &OutputTarget {
                path: dir.path().join("nested/a"),
                format: None,
            },
        )
        .unwrap();
        assert_eq!(kept.path, dir.path().join("nested/a.png"));
        assert_eq!((kept.width, kept.height), (8, 4));
        assert_eq!(std::fs::read(&kept.path).unwrap(), bytes);

        let converted = save(
            &bytes,
            &OutputTarget {
                path: dir.path().join("b.jpg"),
                format: Some(OutputFormat::Jpeg),
            },
        )
        .unwrap();
        assert_eq!(converted.mime_type, "image/jpeg");
        let written = std::fs::read(&converted.path).unwrap();
        assert_eq!(image::guess_format(&written).unwrap(), ImageFormat::Jpeg);
    }

    #[test]
    fn previews_are_small_and_keep_transparency() {
        let opaque = preview(&png(2000, 1000, 255)).unwrap();
        assert_eq!((opaque.width, opaque.height), (512, 256));
        assert_eq!(opaque.mime_type, "image/jpeg");
        let clear = preview(&png(100, 100, 0)).unwrap();
        assert_eq!(clear.mime_type, "image/png");
        assert_eq!((clear.width, clear.height), (100, 100));
    }

    #[test]
    fn display_load_returns_small_files_as_they_are() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.png");
        let bytes = png(10, 10, 255);
        std::fs::write(&path, &bytes).unwrap();
        let shown = load_for_display(&path).unwrap();
        assert_eq!(shown.mime_type, "image/png");
        assert_eq!(
            base64::engine::general_purpose::STANDARD
                .decode(shown.data)
                .unwrap(),
            bytes
        );
    }

    #[test]
    fn references_must_be_images() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.png"), png(2, 2, 255)).unwrap();
        std::fs::write(dir.path().join("b.txt"), b"hello").unwrap();
        let r = read_reference("a.png", dir.path()).unwrap();
        assert_eq!(r.mime_type, "image/png");
        assert_eq!(r.file_name, "a.png");
        assert!(read_reference("b.txt", dir.path()).is_err());
        assert!(read_reference("missing.png", dir.path()).is_err());
    }
}
