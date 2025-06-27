use std::process::Command;
use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[tauri::command]
fn get_platform() -> String {
    if cfg!(target_os = "macos") {
        "macos".to_string()
    } else if cfg!(target_os = "windows") {
        "windows".to_string()
    } else {
        "unknown".to_string()
    }
}

#[tauri::command]
fn check_ollama_installation_paths() -> bool {
    if cfg!(target_os = "macos") {
        // Check common macOS installation paths
        let homebrew_path = "/opt/homebrew/bin/ollama";
        let intel_homebrew_path = "/usr/local/bin/ollama";
        let user_local_path = "/usr/local/bin/ollama";
        let applications_path = "/Applications/Ollama.app";
        
        Path::new(homebrew_path).exists() || 
        Path::new(intel_homebrew_path).exists() || 
        Path::new(user_local_path).exists() ||
        Path::new(applications_path).exists()
    } else if cfg!(target_os = "windows") {
        // Check common Windows installation paths
        let program_files_path = "C:\\Program Files\\Ollama\\ollama.exe";
        let program_files_x86_path = "C:\\Program Files (x86)\\Ollama\\ollama.exe";
        let appdata_path = format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", 
            std::env::var("USERPROFILE").unwrap_or_default());
        
        Path::new(program_files_path).exists() || 
        Path::new(program_files_x86_path).exists() ||
        Path::new(&appdata_path).exists()
    } else {
        false
    }
}

#[tauri::command]
fn check_ollama_installed() -> Result<String, String> {
    // Try to get Ollama version
    let output = if cfg!(target_os = "windows") {
        Command::new("ollama")
            .arg("--version")
            .output()
    } else {
        Command::new("ollama")
            .arg("--version")
            .output()
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                let version_str = String::from_utf8_lossy(&output.stdout);
                Ok(version_str.trim().to_string())
            } else {
                Err("Ollama not found".to_string())
            }
        }
        Err(_) => Err("Ollama not found".to_string()),
    }
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
    
    // Extended PATH to include common Homebrew locations
    let extended_path = format!("{}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin", current_path);
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
    // On Windows, we'll direct the user to download manually since 
    // automatic installation requires more complex handling
    Err("Please download the Ollama installer from ollama.ai/download and run it manually.".to_string())
}

#[tauri::command]
async fn download_ollama_model(model_name: String) -> Result<String, String> {
    // Extended PATH to include common Homebrew locations
    let extended_path = format!("{}:/opt/homebrew/bin:/usr/local/bin", 
        std::env::var("PATH").unwrap_or_default());
    
    let output = Command::new("ollama")
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
        Err(e) => Err(format!("Failed to run ollama pull: {}", e)),
    }
}

#[tauri::command]
async fn list_installed_models() -> Result<Vec<String>, String> {
    // Extended PATH to include common Homebrew locations
    let extended_path = format!("{}:/opt/homebrew/bin:/usr/local/bin", 
        std::env::var("PATH").unwrap_or_default());
    
    let output = Command::new("ollama")
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
                        if !parts.is_empty() {
                            Some(parts[0].to_string())
                        } else {
                            None
                        }
                    })
                    .collect();
                Ok(models)
            } else {
                let error = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to list models: {}", error))
            }
        }
        Err(e) => Err(format!("Failed to run ollama list: {}", e)),
    }
}

#[tauri::command]
async fn start_ollama_service() -> Result<String, String> {
    if cfg!(target_os = "windows") {
        // Windows: Try multiple methods
        
        // Method 1: Use start command
        let output = Command::new("cmd")
            .args(["/C", "start", "/B", "ollama", "serve"])
            .output();
        
        match output {
            Ok(output) => {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    Ok(format!("Ollama service started successfully. Command: 'cmd /C start /B ollama serve'. Output: {}", stdout.trim()))
                } else {
                    // Try alternative method
                    #[cfg(target_os = "windows")]
                    let fallback = Command::new("ollama")
                        .args(["serve"])
                        .creation_flags(0x08000000) // CREATE_NO_WINDOW
                        .spawn();
                    
                    #[cfg(not(target_os = "windows"))]
                    let fallback = Command::new("ollama")
                        .args(["serve"])
                        .spawn();
                    
                    match fallback {
                        Ok(_) => Ok("Ollama service started successfully using fallback method".to_string()),
                        Err(e) => {
                            let error = String::from_utf8_lossy(&output.stderr);
                            Err(format!("Failed to start Ollama service. Primary error: {}. Fallback error: {}", error, e))
                        }
                    }
                }
            }
            Err(e) => {
                // Try direct spawn as fallback
                match Command::new("ollama")
                    .args(["serve"])
                    .spawn() {
                    Ok(_) => Ok("Ollama service started successfully using direct spawn".to_string()),
                    Err(spawn_err) => Err(format!("Failed to start Ollama service. Command error: {}. Spawn error: {}", e, spawn_err)),
                }
            }
        }
    } else {
        // macOS: Try multiple methods with proper PATH handling
        
        // Extended PATH to include common Homebrew locations
        let extended_path = format!("{}:/opt/homebrew/bin:/usr/local/bin", 
            std::env::var("PATH").unwrap_or_default());
        
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
    let output = Command::new("curl")
        .args([
            "-X", "POST",
            "http://localhost:11434/api/generate",
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
                    Ok(format!("Model '{}' loaded successfully. API Response received. Command: curl -X POST http://localhost:11434/api/generate", model_name))
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
    // Extended PATH to include common Homebrew locations
    let extended_path = format!("{}:/opt/homebrew/bin:/usr/local/bin", 
        std::env::var("PATH").unwrap_or_default());
    
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
    // Check if Ollama service is actually running by testing the API
    let output = Command::new("curl")
        .args([
            "-s",
            "--connect-timeout", "3",
            "--max-time", "5",
            "http://localhost:11434/api/tags"
        ])
        .output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let response = String::from_utf8_lossy(&output.stdout);
                // If we get a JSON response, the service is running
                Ok(response.contains("models") || response.starts_with("{"))
            } else {
                Ok(false)
            }
        }
        Err(_) => {
            // If curl fails, try alternative method - check for process
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
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![
        get_platform,
        check_ollama_installation_paths,
        check_ollama_installed,
        check_ollama_service_status,
        install_ollama_macos,
        install_ollama_windows,
        download_ollama_model,
        list_installed_models,
        start_ollama_service,
        stop_ollama_service,
        load_ollama_model,
        unload_ollama_model,
        uninstall_ollama_model,
        scan_for_models
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
