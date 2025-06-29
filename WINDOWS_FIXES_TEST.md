# Windows Model Loading Fixes - Test Build

This commit contains the following Windows-specific fixes for model loading issues:

## Changes Made

### 1. Fixed TypeScript Event Handler Issues
- Fixed `refreshModels` function being used directly as onClick handler
- Added proper event handler wrappers: `handleRefreshModels` and `handleForceRefreshModels`

### 2. Enhanced Windows Model Refresh Logic
- Improved retry logic in `refreshModels` with multiple attempts and increasing delays
- Added Windows-specific aggressive retry with 1s, 3s, and 5s delays
- Enhanced `forceRefreshModels` with backend command fallback

### 3. Periodic Background Refresh (Windows Only)
- Added 30-second interval background model refresh for Windows
- Only triggers when no models are detected
- Automatically cleans up interval on component unmount

### 4. Improved Retry Mechanisms
- Increased max retry attempts from 3 to 5 in `listOllamaModelsWithRetry`
- Added random jitter (0-200ms) to avoid timing conflicts
- Reduced base delay from 1000ms to 800ms for faster response

### 5. Git Submodule Fix
- Removed `.git` directories from `ollama-web-search` and `searxng.bak`
- Fixed GitHub Actions submodule initialization errors

## Expected Results

These changes should resolve the Windows issue where:
- Models don't appear in the UI after loading
- Refresh button doesn't update the model list
- Manual page refresh is required to see loaded models

The fixes implement platform-specific detection and apply more aggressive refresh strategies specifically for Windows environments.
