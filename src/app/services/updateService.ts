import { invoke } from '@tauri-apps/api/core';

interface UpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  download_url?: string;
  release_notes?: string;
  release_url?: string;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    const result = await invoke<UpdateInfo>('check_for_updates');
    return result;
  } catch (error) {
    throw new Error(`Failed to check for updates: ${error}`);
  }
}

export async function downloadUpdate(downloadUrl: string): Promise<string> {
  try {
    const filePath = await invoke<string>('download_update', { downloadUrl });
    return filePath;
  } catch (error) {
    throw new Error(`Failed to download update: ${error}`);
  }
}

export async function getCurrentVersion(): Promise<string> {
  try {
    const version = await invoke<string>('get_current_version');
    return version;
  } catch (error) {
    throw new Error(`Failed to get current version: ${error}`);
  }
}

export async function openDownloadsFolder(): Promise<string> {
  try {
    const result = await invoke<string>('open_downloads_folder');
    return result;
  } catch (error) {
    throw new Error(`Failed to open downloads folder: ${error}`);
  }
}
