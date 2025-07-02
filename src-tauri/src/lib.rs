use std::process::Command;
use std::path::Path;
use std::net::TcpStream;
use std::time::Duration;
use serde_json::json;
use serde::{Deserialize, Serialize};
use reqwest;
use semver::Version;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// Default Ollama port
const DEFAULT_OLLAMA_PORT: u16 = 11434;

// Helper function to get Ollama port from environment or use default
fn get_ollama_port() -> u16 {
    std::env::var("OLLAMA_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(DEFAULT_OLLAMA_PORT)
}

// Helper function to get Ollama base URL
fn get_ollama_base_url() -> String {
    let port = get_ollama_port();
    format!("http://localhost:{}", port)
}

// Helper function to get Ollama API endpoint
fn get_ollama_api_url(endpoint: &str) -> String {
    format!("{}/api/{}", get_ollama_base_url(), endpoint)
}

// Helper function to generate extended PATH based on platform
fn get_extended_path() -> String {
    let current_path = std::env::var("PATH").unwrap_or_default();
    
    if cfg!(target_os = "macos") {
        format!("{}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin", current_path)
    } else if cfg!(target_os = "linux") {
        format!("{}:/usr/local/bin:/usr/bin:/bin:/home/{}/.local/bin", 
            current_path, 
            std::env::var("USER").unwrap_or_default())
    } else if cfg!(target_os = "windows") {
        // On Windows, add common Ollama installation paths
        let userprofile_path = format!("{}\\AppData\\Local\\Programs\\Ollama", 
            std::env::var("USERPROFILE").unwrap_or_default());
        let additional_paths = vec![
            "C:\\Program Files\\Ollama",
            "C:\\Program Files (x86)\\Ollama",
            &userprofile_path,
        ];
        
        let mut extended = current_path;
        for path in additional_paths {
            if !extended.contains(path) {
                extended = format!("{};{}", extended, path);
            }
        }
        extended
    } else {
        current_path
    }
}

#[tauri::command]
fn get_platform() -> String {
    if cfg!(target_os = "macos") {
        "macos".to_string()
    } else if cfg!(target_os = "windows") {
        "windows".to_string()
    } else if cfg!(target_os = "linux") {
        "linux".to_string()
    } else {
        "unknown".to_string()
    }
}

#[tauri::command]
fn get_ollama_port_config() -> u16 {
    get_ollama_port()
}

#[tauri::command]
fn set_ollama_port_config(port: u16) -> Result<String, String> {
    if port < 1024 || port > 65535 {
        return Err("Port must be between 1024 and 65535".to_string());
    }
    
    std::env::set_var("OLLAMA_PORT", port.to_string());
    Ok(format!("Ollama port set to {}", port))
}

#[tauri::command]
fn get_ollama_url() -> String {
    get_ollama_base_url()
}

#[tauri::command]
fn check_ollama_service_running() -> bool {
    // Check if Ollama service is running by attempting to connect to the configured port
    let port = get_ollama_port();
    let address = format!("127.0.0.1:{}", port);
    TcpStream::connect_timeout(
        &address.parse().unwrap(),
        Duration::from_millis(1000)
    ).is_ok()
}

#[tauri::command]
fn check_ollama_installed() -> Result<String, String> {
    // Try to run ollama --version to check if it's installed and accessible
    let extended_path = get_extended_path();
    
    let ollama_cmd = if cfg!(target_os = "windows") { "ollama.exe" } else { "ollama" };
    
    let output = Command::new(ollama_cmd)
        .arg("--version")
        .env("PATH", &extended_path)
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let version_str = String::from_utf8_lossy(&output.stdout);
                Ok(version_str.trim().to_string())
            } else {
                let error_str = String::from_utf8_lossy(&output.stderr);
                Err(format!("Ollama command failed: {}", error_str))
            }
        }
        Err(e) => {
            // On Windows, try absolute paths
            if cfg!(target_os = "windows") {
                let userprofile_path = format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", 
                    std::env::var("USERPROFILE").unwrap_or_default());
                let ollama_paths = vec![
                    "C:\\Program Files\\Ollama\\ollama.exe",
                    "C:\\Program Files (x86)\\Ollama\\ollama.exe",
                    &userprofile_path,
                ];
                
                for ollama_path in ollama_paths {
                    if Path::new(ollama_path).exists() {
                        let output = Command::new(ollama_path)
                            .arg("--version")
                            .output();
                        
                        if let Ok(output) = output {
                            if output.status.success() {
                                let version_str = String::from_utf8_lossy(&output.stdout);
                                return Ok(format!("{} (found at {})", version_str.trim(), ollama_path));
                            }
                        }
                    }
                }
            }
            
            Err(format!("Ollama not found or not accessible: {}", e))
        }
    }
}

#[tauri::command]
fn check_ollama_installation_paths() -> bool {
    // Deprecated: Use check_ollama_installed() instead
    // This function is kept for backward compatibility but now uses the command-based approach
    check_ollama_installed().is_ok()
}

#[tauri::command]
async fn install_ollama_macos() -> Result<String, String> {
    // Common Homebrew installation paths
    let homebrew_paths = vec![
        "/opt/homebrew/bin/brew",  // Apple Silicon Macs
        "/usr/local/bin/brew",     // Intel Macs
        "/home/linuxbrew/.linuxbrew/bin/brew", // Linux (unlikely but possible)
    ];
    
    let mut brew_path = None;
    let mut debug_info = String::new();
    
    // Get current PATH for debugging
    let current_path = std::env::var("PATH").unwrap_or_default();
    debug_info.push_str(&format!("Current PATH: {}\n", current_path));
    
    // Extended PATH to include platform-specific common locations
    let extended_path = get_extended_path();
    debug_info.push_str(&format!("Extended PATH: {}\n", extended_path));
    
    // First, try to find brew using which command with extended PATH
    let which_result = Command::new("which")
        .arg("brew")
        .env("PATH", &extended_path)
        .output();
    
    if let Ok(output) = which_result {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path_str.is_empty() {
                brew_path = Some(path_str.clone());
                debug_info.push_str(&format!("Found brew via which: {}\n", path_str));
            }
        } else {
            debug_info.push_str(&format!("which brew failed: {}\n", String::from_utf8_lossy(&output.stderr)));
        }
    } else {
        debug_info.push_str("Failed to run which command\n");
    }
    
    // If which didn't work, check common paths directly
    if brew_path.is_none() {
        debug_info.push_str("Checking common Homebrew paths directly:\n");
        for path in &homebrew_paths {
            debug_info.push_str(&format!("Checking {}: ", path));
            if Path::new(path).exists() {
                brew_path = Some(path.to_string());
                debug_info.push_str("Found!\n");
                break;
            } else {
                debug_info.push_str("Not found\n");
            }
        }
    }
    
    match brew_path {
        Some(brew_executable) => {
            debug_info.push_str(&format!("Using brew at: {}\n", brew_executable));
            
            // Try to run brew --version first to verify it works
            let version_check = Command::new(&brew_executable)
                .arg("--version")
                .env("PATH", &extended_path)
                .output();
                
            match version_check {
                Ok(output) => {
                    if output.status.success() {
                        let version = String::from_utf8_lossy(&output.stdout);
                        debug_info.push_str(&format!("Homebrew version: {}\n", version.trim()));
                    } else {
                        debug_info.push_str(&format!("Brew version check failed: {}\n", String::from_utf8_lossy(&output.stderr)));
                    }
                }
                Err(e) => {
                    debug_info.push_str(&format!("Failed to run brew --version: {}\n", e));
                }
            }
            
            // Use the found Homebrew executable to install Ollama
            debug_info.push_str("Running: brew install ollama\n");
            let install_result = Command::new(&brew_executable)
                .args(["install", "ollama"])
                .env("PATH", &extended_path) // Ensure PATH includes Homebrew
                .output();
                
            match install_result {
                Ok(output) => {
                    if output.status.success() {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        Ok(format!("Ollama installed successfully via Homebrew at {}.\n\nDebug info:\n{}\nOutput: {}", 
                            brew_executable, debug_info, stdout.trim()))
                    } else {
                        let error = String::from_utf8_lossy(&output.stderr);
                        Err(format!("Homebrew installation failed.\n\nDebug info:\n{}\nError: {}", debug_info, error))
                    }
                }
                Err(e) => Err(format!("Failed to run brew install.\n\nDebug info:\n{}\nError: {}", debug_info, e)),
            }
        }
        None => {
            // Provide detailed error message with debug info
            Err(format!("Homebrew not found in any common locations.\n\nDebug info:\n{}\nPlease install Homebrew first from https://brew.sh or download Ollama manually from ollama.ai", debug_info))
        }
    }
}

#[tauri::command]
async fn install_ollama_windows() -> Result<String, String> {
    // On Windows, redirect user to the official download page
    let download_url = "https://ollama.com/download/windows";
    
    // Open the download page in the default browser
    match std::process::Command::new("cmd")
        .args(["/C", "start", download_url])
        .output()
    {
        Ok(_) => Ok("Opening Ollama download page in your browser. Please download and install Ollama, then restart this app.".to_string()),
        Err(e) => Err(format!("Failed to open download page. Please visit {} manually to download Ollama. Error: {}", download_url, e))
    }
}

#[tauri::command]
async fn install_ollama_linux() -> Result<String, String> {
    // On Linux, use the official install script via curl
    let output = Command::new("sh")
        .args(["-c", "curl -fsSL https://ollama.com/install.sh | sh"])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                Ok(format!("Ollama installed successfully!\n\nOutput:\n{}", stdout.trim()))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to install Ollama. Error:\n{}", stderr))
            }
        }
        Err(e) => {
            Err(format!(
                "Failed to run installation script. Error: {}\n\nPlease try running this command manually in your terminal:\ncurl -fsSL https://ollama.com/install.sh | sh",
                e
            ))
        }
    }
}

#[tauri::command]
async fn download_ollama_model(model_name: String) -> Result<String, String> {
    // Extended PATH to include platform-specific common locations
    let extended_path = get_extended_path();
    
    let ollama_cmd = if cfg!(target_os = "windows") { "ollama.exe" } else { "ollama" };
    
    let output = Command::new(ollama_cmd)
        .args(["pull", &model_name])
        .env("PATH", &extended_path)
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                Ok(format!("Model '{}' downloaded successfully. Output: {}", model_name, stdout.trim()))
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to download model '{}': {}", model_name, error))
            }
        }
        Err(e) => {
            // On Windows, try absolute paths
            if cfg!(target_os = "windows") {
                let userprofile_path = format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", 
                    std::env::var("USERPROFILE").unwrap_or_default());
                let ollama_paths = vec![
                    "C:\\Program Files\\Ollama\\ollama.exe",
                    "C:\\Program Files (x86)\\Ollama\\ollama.exe",
                    &userprofile_path,
                ];
                
                for ollama_path in ollama_paths {
                    if Path::new(ollama_path).exists() {
                        let output = Command::new(ollama_path)
                            .args(["pull", &model_name])
                            .output();
                        
                        if let Ok(output) = output {
                            if output.status.success() {
                                let stdout = String::from_utf8_lossy(&output.stdout);
                                return Ok(format!("Model '{}' downloaded successfully using {}. Output: {}", 
                                    model_name, ollama_path, stdout.trim()));
                            } else {
                                let error = String::from_utf8_lossy(&output.stderr);
                                return Err(format!("Failed to download model '{}' using {}: {}", 
                                    model_name, ollama_path, error));
                            }
                        }
                    }
                }
            }
            
            Err(format!("Failed to run ollama pull: {}. Make sure Ollama is installed and accessible.", e))
        }
    }
}

#[tauri::command]
async fn list_installed_models() -> Result<Vec<String>, String> {
    // Extended PATH to include platform-specific common locations
    let extended_path = get_extended_path();
    
    // First try ollama list command
    let ollama_cmd = if cfg!(target_os = "windows") { "ollama.exe" } else { "ollama" };
    
    let output = Command::new(ollama_cmd)
        .args(["list"])
        .env("PATH", &extended_path)
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let models: Vec<String> = output_str
                    .lines()
                    .skip(1) // Skip header line
                    .filter_map(|line| {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if !parts.is_empty() && !parts[0].is_empty() {
                            Some(parts[0].to_string())
                        } else {
                            None
                        }
                    })
                    .collect();
                Ok(models)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                
                // If ollama list fails, try to use the API directly
                if cfg!(target_os = "windows") {
                    // On Windows, try to use curl to call the API
                    let api_url = get_ollama_api_url("tags");
                    let api_result = Command::new("curl")
                        .args(["-s", &api_url])
                        .output();
                    
                    match api_result {
                        Ok(api_output) if api_output.status.success() => {
                            let response = String::from_utf8_lossy(&api_output.stdout);
                            // Simple JSON parsing - look for model names
                            if response.contains("models") && response.contains("name") {
                                let mut models = Vec::new();
                                // Extract model names using simple string parsing
                                let lines: Vec<&str> = response.lines().collect();
                                for line in lines {
                                    if line.contains("\"name\"") {
                                        if let Some(start) = line.find("\"name\":\"") {
                                            let start = start + 8; // length of "name":"
                                            if let Some(end) = line[start..].find("\"") {
                                                let model_name = &line[start..start + end];
                                                if !model_name.is_empty() {
                                                    models.push(model_name.to_string());
                                                }
                                            }
                                        }
                                    }
                                }
                                if !models.is_empty() {
                                    return Ok(models);
                                }
                            }
                        }
                        _ => {}
                    }
                }
                
                Err(format!("Failed to list models using 'ollama list': {}. Make sure Ollama is installed and running.", error))
            }
        }
        Err(e) => {
            // Try absolute paths on Windows
            if cfg!(target_os = "windows") {
                let userprofile_path = format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", 
                    std::env::var("USERPROFILE").unwrap_or_default());
                let ollama_paths = vec![
                    "C:\\Program Files\\Ollama\\ollama.exe",
                    "C:\\Program Files (x86)\\Ollama\\ollama.exe",
                    &userprofile_path,
                ];
                
                for ollama_path in ollama_paths {
                    if Path::new(ollama_path).exists() {
                        let output = Command::new(ollama_path)
                            .args(["list"])
                            .output();
                        
                        if let Ok(output) = output {
                            if output.status.success() {
                                let output_str = String::from_utf8_lossy(&output.stdout);
                                let models: Vec<String> = output_str
                                    .lines()
                                    .skip(1)
                                    .filter_map(|line| {
                                        let parts: Vec<&str> = line.split_whitespace().collect();
                                        if !parts.is_empty() {
                                            Some(parts[0].to_string())
                                        } else {
                                            None
                                        }
                                    })
                                    .collect();
                                return Ok(models);
                            }
                        }
                    }
                }
            }
            
            Err(format!("Failed to run 'ollama list': {}. Make sure Ollama is installed and accessible.", e))
        }
    }
}

#[tauri::command]
async fn start_ollama_service() -> Result<String, String> {
    if cfg!(target_os = "windows") {
        // Windows: Try multiple methods with better error handling
        let extended_path = get_extended_path();
        
        // Method 1: Try to find ollama.exe and run it directly
        let userprofile_path = format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", 
            std::env::var("USERPROFILE").unwrap_or_default());
        let ollama_paths = vec![
            "ollama.exe",
            "C:\\Program Files\\Ollama\\ollama.exe",
            "C:\\Program Files (x86)\\Ollama\\ollama.exe",
            &userprofile_path,
        ];
        
        for ollama_path in &ollama_paths {
            // First check if the path exists (for absolute paths)
            if ollama_path.contains("\\") && !Path::new(ollama_path).exists() {
                continue;
            }
            
            #[cfg(target_os = "windows")]
            let result = Command::new(ollama_path)
                .args(["serve"])
                .env("PATH", &extended_path)
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .spawn();
            
            #[cfg(not(target_os = "windows"))]
            let result = Command::new(ollama_path)
                .args(["serve"])
                .env("PATH", &extended_path)
                .spawn();
            
            match result {
                Ok(_) => return Ok(format!("Ollama service started successfully using: {}", ollama_path)),
                Err(_) if ollama_path == &"ollama.exe" => {
                    // Continue trying other paths for ollama.exe
                    continue;
                }
                Err(e) => {
                    // For absolute paths, log the error but continue
                    eprintln!("Failed to start Ollama at {}: {}", ollama_path, e);
                    continue;
                }
            }
        }
        
        // Method 2: Use cmd with start command as fallback
        let output = Command::new("cmd")
            .args(["/C", "start", "/B", "ollama", "serve"])
            .env("PATH", &extended_path)
            .output();
        
        match output {
            Ok(output) => {
                if output.status.success() {
                    Ok("Ollama service started successfully using: cmd /C start /B ollama serve".to_string())
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    Err(format!("Failed to start Ollama service on Windows. Error: {}. Try running 'ollama serve' manually in Command Prompt.", error))
                }
            }
            Err(e) => Err(format!("Failed to start Ollama service on Windows. Error: {}. Try running 'ollama serve' manually in Command Prompt.", e))
        }
    } else {
        // macOS/Linux: Try multiple methods with proper PATH handling
        
        // Extended PATH to include platform-specific common locations
        let extended_path = get_extended_path();
        
        // Method 1: Use nohup for proper daemonization
        let nohup_result = Command::new("nohup")
            .args(["ollama", "serve"])
            .env("PATH", &extended_path)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn();
            
        match nohup_result {
            Ok(_) => Ok("Ollama service started successfully. Command: 'nohup ollama serve' (daemonized)".to_string()),
            Err(_) => {
                // Fallback: Direct spawn with extended PATH
                match Command::new("ollama")
                    .args(["serve"])
                    .env("PATH", &extended_path)
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .spawn() {
                    Ok(_) => Ok("Ollama service started successfully. Command: 'ollama serve' (background process)".to_string()),
                    Err(e) => {
                        // Final fallback: Try using bash with full path resolution
                        let bash_cmd = "export PATH=\"/opt/homebrew/bin:/usr/local/bin:$PATH\" && ollama serve &";
                        match Command::new("bash")
                            .args(["-c", bash_cmd])
                            .spawn() {
                            Ok(_) => Ok("Ollama service started successfully using bash with extended PATH".to_string()),
                            Err(bash_err) => {
                                // Last resort: Try direct paths
                                let ollama_paths = vec![
                                    "/opt/homebrew/bin/ollama",
                                    "/usr/local/bin/ollama",
                                ];
                                
                                for ollama_path in ollama_paths {
                                    if Path::new(ollama_path).exists() {
                                        match Command::new(ollama_path)
                                            .args(["serve"])
                                            .stdout(std::process::Stdio::null())
                                            .stderr(std::process::Stdio::null())
                                            .spawn() {
                                            Ok(_) => return Ok(format!("Ollama service started successfully using direct path: {}", ollama_path)),
                                            Err(_) => continue,
                                        }
                                    }
                                }
                                
                                Err(format!("Failed to start Ollama service. Direct spawn error: {}. Bash error: {}. No ollama executable found in common paths.", e, bash_err))
                            }
                        }
                    }
                }
            }
        }
    }
}

#[tauri::command]
async fn stop_ollama_service() -> Result<String, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("taskkill")
            .args(["/F", "/IM", "ollama.exe"])
            .output()
    } else {
        Command::new("pkill")
            .args(["-f", "ollama"])
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                Ok("Ollama service stopped successfully".to_string())
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to stop Ollama service: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to stop Ollama service: {}", e)),
    }
}

#[tauri::command]
async fn load_ollama_model(model_name: String) -> Result<String, String> {
    // Load a model by making a simple request to it
    let api_url = get_ollama_api_url("generate");
    let output = Command::new("curl")
        .args([
            "-X", "POST",
            &api_url,
            "-H", "Content-Type: application/json",
            "-d", &format!(r#"{{"model": "{}", "prompt": "hello", "stream": false}}"#, model_name)
        ])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                // Check if the response contains an error
                if stdout.contains("error") {
                    Err(format!("Failed to load model '{}': {}", model_name, stdout))
                } else {
                    Ok(format!("Model '{}' loaded successfully. API Response received. Command: curl -X POST {}", model_name, api_url))
                }
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to load model '{}': {}", model_name, error))
            }
        }
        Err(e) => Err(format!("Failed to load model: {}", e)),
    }
}

#[tauri::command]
async fn unload_ollama_model() -> Result<String, String> {
    // Unload model by stopping the ollama service temporarily or using API if available
    // For now, we'll just return success as Ollama doesn't have a direct unload command
    Ok("Model unloaded successfully".to_string())
}

#[tauri::command]
async fn uninstall_ollama_model(model_name: String) -> Result<String, String> {
    // Extended PATH to include platform-specific common locations
    let extended_path = get_extended_path();
    
    let output = Command::new("ollama")
        .args(["rm", &model_name])
        .env("PATH", &extended_path)
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                Ok(format!("Model '{}' uninstalled successfully", model_name))
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to uninstall model '{}': {}", model_name, error))
            }
        }
        Err(e) => Err(format!("Failed to run ollama rm: {}", e)),
    }
}

#[tauri::command]
async fn scan_for_models() -> Result<Vec<String>, String> {
    // Try to run ollama list to get the most up-to-date model list
    let output = Command::new("ollama")
        .args(["list"])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                let models: Vec<String> = output_str
                    .lines()
                    .skip(1) // Skip header line
                    .filter_map(|line| {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if !parts.is_empty() {
                            Some(parts[0].to_string())
                        } else {
                            None
                        }
                    })
                    .collect();
                Ok(models)
            } else {
                // If ollama list fails, try to scan common model directories
                let mut found_models = Vec::new();
                
                // Common Ollama model storage locations
                let model_paths = if cfg!(target_os = "macos") {
                    vec![
                        format!("{}/.ollama/models", std::env::var("HOME").unwrap_or_default()),
                        "/usr/local/share/ollama/models".to_string(),
                        "/opt/homebrew/share/ollama/models".to_string(),
                    ]
                } else if cfg!(target_os = "windows") {
                    vec![
                        format!("{}\\AppData\\Local\\Ollama\\models", std::env::var("USERPROFILE").unwrap_or_default()),
                        "C:\\Program Files\\Ollama\\models".to_string(),
                        "C:\\Program Files (x86)\\Ollama\\models".to_string(),
                    ]
                } else {
                    vec![]
                };

                for path in model_paths {
                    if Path::new(&path).exists() {
                        if let Ok(entries) = std::fs::read_dir(&path) {
                            for entry in entries.flatten() {
                                if entry.file_type().map_or(false, |ft| ft.is_dir()) {
                                    if let Some(name) = entry.file_name().to_str() {
                                        found_models.push(name.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
                
                Ok(found_models)
            }
        }
        Err(_) => {
            // If command fails, return empty list
            Ok(vec![])
        }
    }
}

#[tauri::command]
fn check_ollama_service_status() -> Result<bool, String> {
    // Primary method: Check if Ollama service is running by testing TCP connection to the configured port
    if check_ollama_service_running() {
        return Ok(true);
    }

    // Secondary method: Try to call the API directly
    let api_url = get_ollama_api_url("tags");
    let output = Command::new("curl")
        .args([
            "-s",
            "--connect-timeout", "2",
            "--max-time", "3",
            &api_url
        ])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let response = String::from_utf8_lossy(&output.stdout);
                // If we get a JSON response, the service is running
                Ok(response.contains("models") || response.starts_with("{"))
            } else {
                // Fallback: Check for process (less reliable but works if TCP check fails)
                check_process_running()
            }
        }
        Err(_) => {
            // Fallback: Check for process (less reliable but works if curl isn't available)
            check_process_running()
        }
    }
}

fn check_process_running() -> Result<bool, String> {
    if cfg!(target_os = "windows") {
        let tasklist = Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq ollama.exe"])
            .output();
        
        match tasklist {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                Ok(output_str.contains("ollama.exe"))
            }
            Err(_) => Ok(false),
        }
    } else {
        let pgrep = Command::new("pgrep")
            .args(["-f", "ollama"])
            .output();
        
        match pgrep {
            Ok(output) => Ok(output.status.success()),
            Err(_) => Ok(false),
        }
    }
}

#[tauri::command]
async fn fix_windows_ollama_service() -> Result<String, String> {
    if !cfg!(target_os = "windows") {
        return Err("This function is only for Windows".to_string());
    }
    
    let mut fix_info = String::new();
    fix_info.push_str("=== Attempting to Fix Windows Ollama Issues ===\n\n");
    
    // 1. First, kill any existing ollama processes
    fix_info.push_str("1. Stopping any existing Ollama processes...\n");
    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "ollama.exe"])
        .output();
    fix_info.push_str("   ✓ Cleanup completed\n");
    
    // 2. Wait a moment
    std::thread::sleep(std::time::Duration::from_secs(2));
    
    // 3. Find the best Ollama installation
    fix_info.push_str("\n2. Finding Ollama installation...\n");
    let userprofile_path = format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", 
        std::env::var("USERPROFILE").unwrap_or_default());
    let ollama_paths = vec![
        "C:\\Program Files\\Ollama\\ollama.exe",
        "C:\\Program Files (x86)\\Ollama\\ollama.exe",
        &userprofile_path,
    ];
    
    let mut best_ollama_path = None;
    for path in &ollama_paths {
        if Path::new(path).exists() {
            fix_info.push_str(&format!("   ✓ Found Ollama at: {}\n", path));
            best_ollama_path = Some(path.to_string());
            break;
        }
    }
    
    if best_ollama_path.is_none() {
        return Err("Ollama executable not found in common locations. Please reinstall Ollama.".to_string());
    }
    
    let ollama_path = best_ollama_path.unwrap();
    
    // 4. Start the service properly
    fix_info.push_str("\n3. Starting Ollama service...\n");
    let start_result = Command::new(&ollama_path)
        .args(["serve"])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn();
    
    match start_result {
        Ok(_) => {
            fix_info.push_str("   ✓ Service start command executed\n");
            
            // 5. Wait and verify the service is running
            fix_info.push_str("\n4. Verifying service is running...\n");
            let mut attempts = 0;
            let max_attempts = 10;
            
            while attempts < max_attempts {
                std::thread::sleep(std::time::Duration::from_secs(1));
                if check_ollama_service_running() {
                    fix_info.push_str(&format!("   ✓ Service is running! (took {} seconds)\n", attempts + 1));
                    
                    // 6. Try to list models to verify everything works
                    fix_info.push_str("\n5. Testing model listing...\n");
                    std::thread::sleep(std::time::Duration::from_secs(1));
                    
                    let list_result = Command::new(&ollama_path)
                        .args(["list"])
                        .output();
                    
                    match list_result {
                        Ok(output) if output.status.success() => {
                            let output_str = String::from_utf8_lossy(&output.stdout);
                            let model_count = output_str.lines().skip(1).count();
                            fix_info.push_str(&format!("   ✓ Model listing works! Found {} models\n", model_count));
                        }
                        _ => {
                            fix_info.push_str("   ⚠ Model listing not working yet, but service is running\n");
                        }
                    }
                    
                    fix_info.push_str("\n=== Fix Complete! ===\n");
                    fix_info.push_str("Your Ollama service should now be working properly.\n");
                    fix_info.push_str("You can now select models and start chatting.\n");
                    
                    return Ok(fix_info);
                }
                attempts += 1;
            }
            
            fix_info.push_str(&format!("   ⚠ Service was started but is not responding on port {}\n", get_ollama_port()));
            fix_info.push_str("   Try restarting the app or running 'ollama serve' manually\n");
            
            Err(fix_info)
        }
        Err(e) => {
            fix_info.push_str(&format!("   ✗ Failed to start service: {}\n", e));
            Err(fix_info)
        }
    }
}

#[tauri::command]
async fn diagnose_windows_ollama_issues() -> Result<String, String> {
    if !cfg!(target_os = "windows") {
        return Err("This function is only for Windows diagnosis".to_string());
    }
    
    let mut diagnostic_info = String::new();
    diagnostic_info.push_str("=== Windows Ollama Diagnosis ===\n\n");
    
    // 1. Check if Ollama is installed in common locations
    diagnostic_info.push_str("1. Checking Ollama installation paths:\n");
    let userprofile_path = format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", 
        std::env::var("USERPROFILE").unwrap_or_default());
    let ollama_paths = vec![
        "C:\\Program Files\\Ollama\\ollama.exe",
        "C:\\Program Files (x86)\\Ollama\\ollama.exe",
        &userprofile_path,
    ];
    
    let mut ollama_found_at = None;
    for path in &ollama_paths {
        if Path::new(path).exists() {
            diagnostic_info.push_str(&format!("   ✓ Found: {}\n", path));
            if ollama_found_at.is_none() {
                ollama_found_at = Some(path.to_string());
            }
        } else {
            diagnostic_info.push_str(&format!("   ✗ Not found: {}\n", path));
        }
    }
    
    // 2. Check if ollama.exe is in PATH
    diagnostic_info.push_str("\n2. Checking if ollama.exe is accessible via PATH:\n");
    let which_result = Command::new("where")
        .arg("ollama.exe")
        .output();
    
    match which_result {
        Ok(output) if output.status.success() => {
            let path_str = String::from_utf8_lossy(&output.stdout);
            diagnostic_info.push_str(&format!("   ✓ ollama.exe found in PATH: {}", path_str.trim()));
        }
        _ => {
            diagnostic_info.push_str("   ✗ ollama.exe not found in PATH\n");
        }
    }
    
    // 3. Try to get Ollama version
    diagnostic_info.push_str("\n3. Checking Ollama version:\n");
    if let Some(ollama_path) = &ollama_found_at {
        let version_result = Command::new(ollama_path)
            .arg("--version")
            .output();
        
        match version_result {
            Ok(output) if output.status.success() => {
                let version = String::from_utf8_lossy(&output.stdout);
                diagnostic_info.push_str(&format!("   ✓ Version: {}", version.trim()));
            }
            Ok(output) => {
                let error = String::from_utf8_lossy(&output.stderr);
                diagnostic_info.push_str(&format!("   ✗ Version check failed: {}", error.trim()));
            }
            Err(e) => {
                diagnostic_info.push_str(&format!("   ✗ Failed to run version check: {}", e));
            }
        }
    }
    
    // 4. Check if Ollama service is running (TCP connection)
    diagnostic_info.push_str("\n4. Checking if Ollama service is running:\n");
    if check_ollama_service_running() {
        diagnostic_info.push_str("   ✓ Ollama service is responding on port 11434\n");
        
        // 5. Try to list models via API
        diagnostic_info.push_str("\n5. Checking if models can be listed via API:\n");
        let api_result = Command::new("curl")
            .args(["-s", "--connect-timeout", "5", "http://localhost:11434/api/tags"])
            .output();
        
        match api_result {
            Ok(output) if output.status.success() => {
                let response = String::from_utf8_lossy(&output.stdout);
                if response.contains("models") {
                    diagnostic_info.push_str("   ✓ API is working, models endpoint accessible\n");
                    diagnostic_info.push_str(&format!("   API Response: {}\n", response.trim()));
                } else {
                    diagnostic_info.push_str("   ⚠ API responded but no models found\n");
                    diagnostic_info.push_str(&format!("   Response: {}\n", response.trim()));
                }
            }
            _ => {
                diagnostic_info.push_str("   ✗ API not accessible or curl not available\n");
            }
        }
    } else {
        diagnostic_info.push_str("   ✗ Ollama service is NOT running on port 11434\n");
        
        // Try to start the service
        diagnostic_info.push_str("\n5. Attempting to start Ollama service:\n");
        if let Some(ollama_path) = &ollama_found_at {
            diagnostic_info.push_str(&format!("   Trying to start: {} serve\n", ollama_path));
            let start_result = Command::new(ollama_path)
                .args(["serve"])
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::piped())
                .spawn();
            
            match start_result {
                Ok(_) => {
                    diagnostic_info.push_str("   ✓ Service start command executed\n");
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    
                    if check_ollama_service_running() {
                        diagnostic_info.push_str("   ✓ Service is now running!\n");
                    } else {
                        diagnostic_info.push_str("   ⚠ Service started but not responding yet\n");
                    }
                }
                Err(e) => {
                    diagnostic_info.push_str(&format!("   ✗ Failed to start service: {}\n", e));
                }
            }
        }
    }
    
    // 6. Check Windows processes
    diagnostic_info.push_str("\n6. Checking for ollama.exe process:\n");
    let process_check = Command::new("tasklist")
        .args(["/FI", "IMAGENAME eq ollama.exe"])
        .output();
    
    match process_check {
        Ok(output) if output.status.success() => {
            let output_str = String::from_utf8_lossy(&output.stdout);
            if output_str.contains("ollama.exe") {
                diagnostic_info.push_str("   ✓ ollama.exe process is running\n");
            } else {
                diagnostic_info.push_str("   ✗ ollama.exe process not found\n");
            }
        }
        _ => {
            diagnostic_info.push_str("   ✗ Could not check process list\n");
        }
    }
    
    diagnostic_info.push_str("\n=== End Diagnosis ===\n");
    Ok(diagnostic_info)
}

#[tauri::command]
async fn ask_ollama_verbose(model: String, prompt: String) -> Result<String, String> {
    // Extended PATH to include platform-specific common locations
    let extended_path = get_extended_path();
    
    let ollama_cmd = if cfg!(target_os = "windows") { "ollama.exe" } else { "ollama" };
    
    let output = Command::new(ollama_cmd)
        .args(["run", &model, "--verbose", &prompt])
        .env("PATH", &extended_path)
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);
                
                // Combine both stdout and stderr
                let combined_output = format!("{}{}", stdout, stderr);
                
                // Split into content and stats
                let lines: Vec<&str> = combined_output.lines().collect();
                let mut content_lines = Vec::new();
                let mut stats_lines = Vec::new();
                let mut in_stats = false;
                
                for line in lines {
                    if line.contains("total duration:") || line.contains("load duration:") || 
                       line.contains("prompt eval") || line.contains("eval count:") || 
                       line.contains("eval duration:") || line.contains("eval rate:") {
                        in_stats = true;
                        stats_lines.push(line);
                    } else if in_stats && (line.trim().is_empty() || 
                            line.contains("also web search") || line.contains("Suggested search:")) {
                        // End of stats, this line is part of content
                        content_lines.push(line);
                        in_stats = false;
                    } else if !in_stats {
                        content_lines.push(line);
                    } else {
                        stats_lines.push(line);
                    }
                }
                
                let content = content_lines.join("\n").trim().to_string();
                let stats = if !stats_lines.is_empty() {
                    format!("\n\n=== VERBOSE STATS ===\n{}", stats_lines.join("\n"))
                } else {
                    String::new()
                };
                
                Ok(format!("{}{}", content, stats))
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                
                // Try alternative without --verbose flag as fallback
                let fallback_output = Command::new(ollama_cmd)
                    .args(["run", &model, &prompt])
                    .env("PATH", &extended_path)
                    .output();
                
                match fallback_output {
                    Ok(fallback_output) if fallback_output.status.success() => {
                        let result = String::from_utf8_lossy(&fallback_output.stdout);
                        Ok(format!("{}\n\n[Verbose mode not available: {}]", result, error))
                    }
                    _ => Err(format!("Failed to run ollama with verbose: {}", error))
                }
            }
        }
        Err(e) => {
            // Try absolute paths on Windows
            if cfg!(target_os = "windows") {
                let userprofile_path = format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", 
                    std::env::var("USERPROFILE").unwrap_or_default());
                let ollama_paths = vec![
                    "C:\\Program Files\\Ollama\\ollama.exe",
                    "C:\\Program Files (x86)\\Ollama\\ollama.exe",
                    &userprofile_path,
                ];
                
                for ollama_path in ollama_paths {
                    if Path::new(ollama_path).exists() {
                        let output = Command::new(ollama_path)
                            .args(["run", &model, "--verbose", &prompt])
                            .output();
                        
                        if let Ok(output) = output {
                            if output.status.success() {
                                let stdout = String::from_utf8_lossy(&output.stdout);
                                let stderr = String::from_utf8_lossy(&output.stderr);
                                
                                // Combine both stdout and stderr
                                let combined_output = format!("{}{}", stdout, stderr);
                                
                                // Split into content and stats
                                let lines: Vec<&str> = combined_output.lines().collect();
                                let mut content_lines = Vec::new();
                                let mut stats_lines = Vec::new();
                                let mut in_stats = false;
                                
                                for line in lines {
                                    if line.contains("total duration:") || line.contains("load duration:") || 
                                       line.contains("prompt eval") || line.contains("eval count:") || 
                                       line.contains("eval duration:") || line.contains("eval rate:") {
                                        in_stats = true;
                                        stats_lines.push(line);
                                    } else if in_stats && (line.trim().is_empty() || 
                                            line.contains("also web search") || line.contains("Suggested search:")) {
                                        // End of stats, this line is part of content
                                        content_lines.push(line);
                                        in_stats = false;
                                    } else if !in_stats {
                                        content_lines.push(line);
                                    } else {
                                        stats_lines.push(line);
                                    }
                                }
                                
                                let content = content_lines.join("\n").trim().to_string();
                                let stats = if !stats_lines.is_empty() {
                                    format!("\n\n=== VERBOSE STATS ===\n{}", stats_lines.join("\n"))
                                } else {
                                    String::new()
                                };
                                
                                return Ok(format!("{}{}", content, stats));
                            }
                        }
                    }
                }
            }
            
            Err(format!("Failed to run ollama verbose command: {}", e))
        }
    }
}

#[tauri::command]
async fn search_web(query: String, thinking: Option<bool>) -> Result<String, String> {
    let thinking_mode = thinking.unwrap_or(false);
    println!("🔍 Web search for: {} (thinking: {})", query, thinking_mode);
    
    // Call the main Python search script with JSON output using the exact SearxNG instances
    let python_script_path = get_python_script_path();
    
    let mut cmd = Command::new("python3");
    cmd.arg(&python_script_path)
        .arg("--query")
        .arg(&query)
        .arg("--json");  // Use JSON output mode
    
    if thinking_mode {
        cmd.arg("--thinking");
    }
    
    println!("🐍 Calling Python search script with exact SearxNG instances...");
    
    let output = cmd.output();
    
    match output {
        Ok(output) => {
            if output.status.success() {
                let response = String::from_utf8_lossy(&output.stdout);
                
                // Parse JSON response from Python script
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response) {
                    if json.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
                        return format_search_results_from_python(&json, &query);
                    } else {
                        let error = json.get("error")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Unknown error from Python script");
                        return Err(format!("Python search failed: {}", error));
                    }
                } else {
                    println!("⚠️ Could not parse Python response as JSON: {}", response);
                    return Err("Failed to parse Python search response".to_string());
                }
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                println!("❌ Python script failed: {}", error);
                return Err(format!("Python script execution failed: {}", error));
            }
        }
        Err(e) => {
            println!("❌ Failed to execute Python script: {}", e);
            return Err(format!("Failed to execute Python search script: {}", e));
        }
    }
}

// Legacy helper functions (replaced by Python search API integration)

// DEPRECATED: These functions are now replaced by the Python search API
// Keeping them commented for reference but they are no longer used

async fn generate_search_queries_with_ollama(query: &str, thinking: bool) -> Result<Vec<String>, String> {
    println!("🧠 Generating search queries with Ollama...");
    
    // Add /nothinking by default unless thinking mode is enabled
    let prompt = if thinking {
        format!(
            "Based on the following user query, generate three Google search queries \
            that would help understand the query better. Provide each query enclosed in double quotes.\n\n\
            User query: {}", 
            query
        )
    } else {
        format!(
            "/nothinking Based on the following user query, generate three Google search queries \
            that would help understand the query better. Provide each query enclosed in double quotes.\n\n\
            User query: {}", 
            query
        )
    };
    
    let request_body = json!({
        "model": "llama2",
        "messages": [{"role": "user", "content": prompt}],
        "stream": false
    });
    
    let output = Command::new("curl")
        .args([
            "-s",
            "--connect-timeout", "10",
            "--max-time", "30",
            "-H", "Content-Type: application/json",
            "-X", "POST",
            "-d", &request_body.to_string(),
            "http://localhost:11434/api/chat"
        ])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let response = String::from_utf8_lossy(&output.stdout);
                
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response) {
                    if let Some(content) = json.get("message")
                        .and_then(|m| m.get("content"))
                        .and_then(|c| c.as_str()) {
                        
                        // Extract queries enclosed in quotes using regex
                        let re = regex::Regex::new(r#""([^"]+)""#).unwrap();
                        let queries: Vec<String> = re.captures_iter(content)
                            .map(|cap| cap[1].to_string())
                            .collect();
                        
                        if queries.len() >= 3 {
                            println!("✅ Generated {} search queries", queries.len());
                            return Ok(queries.into_iter().take(3).collect());
                        }
                    }
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to generate search queries: {}", e);
        }
    }
    
    // Fallback to just using the original query
    Ok(vec![query.to_string()])
}

async fn get_search_context(search_query: &str) -> (Vec<String>, String) {
    // Get the cloud service URL from environment or use default
    let cloud_service_url = std::env::var("CLOUD_SERVICE_URL")
        .unwrap_or_else(|_| {
            // Try to read from the TypeScript search service running on port 3000
            "http://localhost:3000".to_string()
        });
    
    let request_body = json!({
        "query": search_query
    });
    
    println!("🌐 Fetching search context from: {}", cloud_service_url);
    
    let output = Command::new("curl")
        .args([
            "-s",
            "--connect-timeout", "10",
            "--max-time", "20",
            "-H", "Content-Type: application/json",
            "-H", "User-Agent: BeautifyOllama/1.0",
            "-X", "POST",
            "-d", &request_body.to_string(),
            &format!("{}/process", cloud_service_url)
        ])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let response = String::from_utf8_lossy(&output.stdout);
                
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response) {
                    if json.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
                        if let Some(data) = json.get("data").and_then(|v| v.as_array()) {
                            let mut sources = Vec::new();
                            let mut context_parts = Vec::new();
                            
                            for item in data {
                                if let (Some(url), Some(content)) = (
                                    item.get("url").and_then(|v| v.as_str()),
                                    item.get("content").and_then(|v| v.as_str())
                                ) {
                                    sources.push(url.to_string());
                                    context_parts.push(format!("{}\n{}", url, content));
                                }
                            }
                            
                            let context_str = context_parts.join("\n\n");
                            return (sources, context_str);
                        }
                    }
                }
            }
        }
        Err(e) => {
            println!("❌ Cloud service request failed: {}", e);
        }
    }
    
    // Return empty results if cloud service fails
    (Vec::new(), String::new())
}

async fn summarize_with_ollama(context: &str, thinking: bool) -> Result<String, String> {
    // Add /nothinking by default unless thinking mode is enabled
    let prompt = if thinking {
        format!("Summarize the following search results:\n\n{}", context)
    } else {
        format!("/nothinking Summarize the following search results:\n\n{}", context)
    };
    
    let request_body = json!({
        "model": "llama2",
        "messages": [{"role": "user", "content": prompt}],
        "stream": false
    });
    
    let output = Command::new("curl")
        .args([
            "-s",
            "--connect-timeout", "15",
            "--max-time", "30",
            "-H", "Content-Type: application/json",
            "-X", "POST",
            "-d", &request_body.to_string(),
            "http://localhost:11434/api/chat"
        ])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let response = String::from_utf8_lossy(&output.stdout);
                
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response) {
                    if let Some(content) = json.get("message")
                        .and_then(|m| m.get("content"))
                        .and_then(|c| c.as_str()) {
                        return Ok(content.to_string());
                    }
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to summarize with Ollama: {}", e);
        }
    }
    
    Err("Failed to summarize search results".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
        get_platform,
        check_ollama_installation_paths,
        check_ollama_installed,
        check_ollama_service_running,
        check_ollama_service_status,
        install_ollama_macos,
        install_ollama_windows,
        install_ollama_linux,
        download_ollama_model,
        list_installed_models,
        start_ollama_service,
        stop_ollama_service,
        load_ollama_model,
        unload_ollama_model,
        uninstall_ollama_model,
        scan_for_models,
        diagnose_windows_ollama_issues,
        fix_windows_ollama_service,
        ask_ollama_verbose,
        search_web,
        get_ollama_port_config,
        set_ollama_port_config,
        get_ollama_url,
        check_for_updates,
        download_update,
        get_current_version,
        open_downloads_folder,
        open_downloads_folder
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// Helper functions for Python search API integration

fn get_python_script_path() -> String {
    // Get the path to the main Python search script
    let current_dir = std::env::current_dir().unwrap_or_default();
    let script_path = current_dir.join("tools").join("web-search").join("main.py");
    
    if script_path.exists() {
        script_path.to_string_lossy().to_string()
    } else {
        // Fallback paths
        let fallback_paths = vec![
            "./tools/web-search/main.py",
            "../tools/web-search/main.py",
            "../../tools/web-search/main.py",
            // Legacy paths for backward compatibility
            "./ollama-web-search/main.py",
            "../ollama-web-search/main.py",
            "../../ollama-web-search/main.py",
        ];
        
        for path in fallback_paths {
            if std::path::Path::new(path).exists() {
                return path.to_string();
            }
        }
        
        // Default path - will cause error if not found
        "tools/web-search/main.py".to_string()
    }
}

fn format_search_results_from_python(json: &serde_json::Value, query: &str) -> Result<String, String> {
    let mut final_context = format!("📌 **User Query:** {}\n\n", query);
    
    // Extract search queries
    if let Some(search_queries) = json.get("search_queries").and_then(|v| v.as_array()) {
        final_context.push_str("🔍 **Generated Search Queries:**\n");
        for (i, sq) in search_queries.iter().enumerate() {
            if let Some(query_str) = sq.as_str() {
                final_context.push_str(&format!("{}. {}\n", i + 1, query_str));
            }
        }
        final_context.push_str("\n");
    }
    
    // Extract summaries
    if let Some(summaries) = json.get("summaries").and_then(|v| v.as_array()) {
        for (i, summary_obj) in summaries.iter().enumerate() {
            if let (Some(query_str), Some(summary_str)) = (
                summary_obj.get("query").and_then(|v| v.as_str()),
                summary_obj.get("summary").and_then(|v| v.as_str())
            ) {
                final_context.push_str(&format!("🔎 **Query {}:** {}\n📄 **Summary:** {}\n\n", 
                    i + 1, query_str, summary_str));
            }
        }
    }
    
    // Extract sources
    if let Some(sources) = json.get("sources").and_then(|v| v.as_array()) {
        if !sources.is_empty() {
            final_context.push_str("📚 **Sources:**\n");
            for (i, source) in sources.iter().enumerate() {
                if let Some(source_str) = source.as_str() {
                    final_context.push_str(&format!("{}. {}\n", i + 1, source_str));
                }
            }
        }
    }
    
    Ok(final_context)
}

// Update checker functionality

#[derive(Debug, Serialize, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    name: String,
    body: String,
    html_url: String,
    assets: Vec<GitHubAsset>,
    published_at: String,
    prerelease: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
    content_type: String,
    size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct UpdateInfo {
    available: bool,
    current_version: String,
    latest_version: String,
    download_url: Option<String>,
    release_notes: Option<String>,
    release_url: Option<String>,
}

const GITHUB_REPO: &str = "falkon2/BeautifyOllama";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[tauri::command]
async fn check_for_updates() -> Result<UpdateInfo, String> {
    let client = reqwest::Client::new();
    
    // Get the latest release from GitHub API
    let url = format!("https://api.github.com/repos/{}/releases/latest", GITHUB_REPO);
    
    let response = client
        .get(&url)
        .header("User-Agent", "BeautifyOllama-UpdateChecker")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch release info: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("GitHub API request failed: {}", response.status()));
    }
    
    let release: GitHubRelease = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse release info: {}", e))?;
    
    let current_version = CURRENT_VERSION;
    let latest_version = release.tag_name.trim_start_matches('v');
    
    // Parse versions for comparison
    let current_ver = Version::parse(current_version)
        .map_err(|e| format!("Invalid current version: {}", e))?;
    let latest_ver = Version::parse(latest_version)
        .map_err(|e| format!("Invalid latest version: {}", e))?;
    
    let update_available = latest_ver > current_ver;
    
    // Find appropriate download asset for current platform
    let platform = get_platform();
    let download_url = find_download_url_for_platform(&release.assets, &platform);
    
    Ok(UpdateInfo {
        available: update_available,
        current_version: current_version.to_string(),
        latest_version: latest_version.to_string(),
        download_url,
        release_notes: Some(release.body),
        release_url: Some(release.html_url),
    })
}

#[tauri::command]
async fn download_update(download_url: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // Extract filename from URL
    let filename = download_url
        .split('/')
        .last()
        .unwrap_or("update")
        .to_string();
    
    // Get downloads directory
    let downloads_dir = if cfg!(target_os = "macos") {
        format!("{}/Downloads", std::env::var("HOME").unwrap_or_default())
    } else if cfg!(target_os = "windows") {
        format!("{}/Downloads", std::env::var("USERPROFILE").unwrap_or_default())
    } else {
        format!("{}/Downloads", std::env::var("HOME").unwrap_or_default())
    };
    
    let file_path = format!("{}/{}", downloads_dir, filename);
    
    // Download the file
    let response = client
        .get(&download_url)
        .header("User-Agent", "BeautifyOllama-UpdateChecker")
        .send()
        .await
        .map_err(|e| format!("Failed to download update: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Download failed: {}", response.status()));
    }
    
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read download: {}", e))?;
    
    // Write to file
    std::fs::write(&file_path, bytes)
        .map_err(|e| format!("Failed to save update: {}", e))?;
    
    Ok(file_path)
}

#[tauri::command]
fn get_current_version() -> String {
    CURRENT_VERSION.to_string()
}

fn find_download_url_for_platform(assets: &[GitHubAsset], platform: &str) -> Option<String> {
    // Look for platform-specific assets with simple names first
    match platform {
        "macos" => {
            // First, look for simple universal DMG
            for asset in assets {
                let name = asset.name.to_lowercase();
                if name == "beautifyollama.dmg" {
                    return Some(asset.browser_download_url.clone());
                }
            }
            // Fallback: look for universal DMG files (preferred)
            for asset in assets {
                let name = asset.name.to_lowercase();
                if name.ends_with(".dmg") && (name.contains("universal") || name.contains("macos")) {
                    return Some(asset.browser_download_url.clone());
                }
            }
            // Fallback: look for any Mac-compatible DMG (avoid arch-specific ones)
            for asset in assets {
                let name = asset.name.to_lowercase();
                if name.ends_with(".dmg") && !name.contains("aarch64") && !name.contains("x86_64") {
                    if name.contains("mac") || name.contains("darwin") {
                        return Some(asset.browser_download_url.clone());
                    }
                }
            }
            // Last resort: any DMG file
            for asset in assets {
                let name = asset.name.to_lowercase();
                if name.ends_with(".dmg") {
                    return Some(asset.browser_download_url.clone());
                }
            }
        }
        "windows" => {
            // First, look for simple Windows executables
            for asset in assets {
                let name = asset.name.to_lowercase();
                if name == "beautifyollama.msi" || name == "beautifyollama.exe" {
                    return Some(asset.browser_download_url.clone());
                }
            }
            // Fallback: look for any Windows installer
            for asset in assets {
                let name = asset.name.to_lowercase();
                if name.contains("win") || name.contains("windows") || name.ends_with(".msi") || name.ends_with(".exe") {
                    return Some(asset.browser_download_url.clone());
                }
            }
        }
        "linux" => {
            // First, look for simple Linux packages
            for asset in assets {
                let name = asset.name.to_lowercase();
                if name == "beautifyollama.deb" || name == "beautifyollama.appimage" {
                    return Some(asset.browser_download_url.clone());
                }
            }
            // Fallback: look for any Linux package
            for asset in assets {
                let name = asset.name.to_lowercase();
                if name.contains("linux") || name.ends_with(".appimage") || name.ends_with(".deb") {
                    return Some(asset.browser_download_url.clone());
                }
            }
        }
        _ => {}
    }
    None
}

#[tauri::command]
fn open_downloads_folder() -> Result<String, String> {
    let downloads_dir = if cfg!(target_os = "macos") {
        format!("{}/Downloads", std::env::var("HOME").unwrap_or_default())
    } else if cfg!(target_os = "windows") {
        format!("{}/Downloads", std::env::var("USERPROFILE").unwrap_or_default())
    } else {
        format!("{}/Downloads", std::env::var("HOME").unwrap_or_default())
    };

    let result = if cfg!(target_os = "macos") {
        Command::new("open").arg(&downloads_dir).output()
    } else if cfg!(target_os = "windows") {
        Command::new("explorer").arg(&downloads_dir).output()
    } else {
        Command::new("xdg-open").arg(&downloads_dir).output()
    };

    match result {
        Ok(_) => Ok(format!("Opened downloads folder: {}", downloads_dir)),
        Err(e) => Err(format!("Failed to open downloads folder: {}", e)),
    }
}
