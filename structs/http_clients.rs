use std::collections::HashMap;
use reqwest::Client;
use reqwest::header::HeaderMap;
use serde::de::DeserializeOwned;
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct FetchResponse<T> {
    pub status: u16,
    pub headers: HeaderMap,
    pub url: String,
    pub data: T,
    pub pass_data: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone)]
pub struct FetchError {
    pub status: u16,
    pub headers: HeaderMap,
    pub url: String,
    pub error: String,
    pub error_type: String,
    pub data: Option<String>,
}

pub struct FetchOptions {
    pub url: String,
    pub method: String,
    pub headers: HeaderMap,
    pub user_agent: String,
    pub data: Value,
    pub is_text: bool,
    pub pass_data: Option<HashMap<String, String>>,
}

impl Default for FetchOptions {
    fn default() -> Self {
        FetchOptions {
            url: String::from(""),
            method: String::from("GET"),
            headers: HeaderMap::new(),
            user_agent: String::from("ValorantLabs/9.0.0"),
            data: Value::Null,
            is_text: false,
            pass_data: None,
        }
    }
}

pub async fn fetch<T: DeserializeOwned + std::fmt::Debug + Clone>(
    options: FetchOptions
) -> Result<FetchResponse<T>, FetchError> {
    if cfg!(debug_assertions) {
        println!("[DEBUG] Fetching: {}", options.url);
    }
    let mut http_client = Client::builder();
    http_client = http_client.user_agent(options.user_agent);
    http_client = http_client.default_headers(options.headers);
    let http_client_build = match http_client.build() {
        Ok(v) => v,
        Err(e) => {
            eprintln!("[FETCH] Error: {:?}", e);
            return Err(FetchError {
                status: 500,
                headers: HeaderMap::new(),
                url: options.url,
                error: String::from("Error while building HTTP Client"),
                error_type: String::from("HTTP_CLIENT"),
                data: None,
            });
        }
    };
    let body = match options.method.as_str() {
        "GET" => http_client_build.get(options.url.clone()).send().await,
        "POST" => http_client_build.post(options.url.clone()).json(&options.data).send().await,
        "PUT" => http_client_build.put(options.url.clone()).json(&options.data).send().await,
        "DELETE" => http_client_build.delete(options.url.clone()).send().await,
        _ => http_client_build.get(options.url.clone()).send().await,
    };
    match body {
        Ok(v) => {
            let status = v.status().as_u16();
            let headers = v.headers().clone();
            let url = v.url().to_string();
            let text = v.text().await.unwrap();
            let decode = serde_json::from_str::<T>(&text);
            if decode.is_err() {
                let deserializer = &mut serde_json::Deserializer::from_str(&text);
                let error = serde_path_to_error::deserialize::<_, T>(deserializer).err();
                let path = error.as_ref().unwrap().path().to_string();
                if cfg!(debug_assertions) {
                    eprintln!("[DEBUG] Error Decoding: {:?}", &url);
                    eprintln!("[DEBUG] Error Decoding: {:?}", &path);
                };
                return Err(FetchError {
                    status,
                    headers: HeaderMap::new(),
                    url: url.clone(),
                    error: String::from("Error while parsing JSON"),
                    error_type: String::from("PARSE_JSON"),
                    data: Some(path),
                });
            }
            let response = FetchResponse {
                status,
                headers,
                url,
                data: decode.unwrap(),
                pass_data: options.pass_data,
            };
            Ok(response)
        }
        Err(e) => {
            eprintln!("[FETCH] Error: {:?}", e);
            Err(FetchError {
                status: 500,
                headers: HeaderMap::new(),
                url: options.url.clone(),
                error: e.to_string(),
                error_type: String::from("HTTP_CLIENT"),
                data: None,
            })
        }
    }
}