"use client";

import { useState } from "react";
import { Download, X, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadUpdate, openDownloadsFolder } from "@/app/services/updateService";

interface UpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  download_url?: string;
  release_notes?: string;
  release_url?: string;
}

interface UpdatePopupProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
}

export function UpdatePopup({ isOpen, onClose, updateInfo }: UpdatePopupProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadUpdateHandler = async () => {
    if (!updateInfo?.download_url) {
      setError('No download URL available');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const filePath = await downloadUpdate(updateInfo.download_url);
      
      // Show success message and open file location
      alert(`Update downloaded successfully to: ${filePath}\n\nPlease close the app and install the update.`);
      
      // Optionally open the downloads folder
      if (window.confirm('Would you like to open the Downloads folder?')) {
        await openDownloadsFolder();
      }
      
      onClose();
    } catch (err: any) {
      setError(`Failed to download update: ${err.message}`);
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const openReleaseNotes = () => {
    if (updateInfo?.release_url) {
      window.open(updateInfo.release_url, '_blank');
    }
  };

  if (!isOpen || !updateInfo?.available) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Update Available
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              A new version of BeautifyOllama is available!
            </p>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-gray-500">Current:</span>{' '}
                <span className="font-mono text-gray-900 dark:text-white">
                  v{updateInfo.current_version}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Latest:</span>{' '}
                <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  v{updateInfo.latest_version}
                </span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            {updateInfo.download_url && (
              <Button
                onClick={downloadUpdateHandler}
                disabled={downloading}
                className="w-full"
                size="lg"
              >
                {downloading ? (
                  <>
                    <Download className="h-4 w-4 mr-2 animate-pulse" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Update
                  </>
                )}
              </Button>
            )}

            <div className="flex space-x-2">
              {updateInfo.release_url && (
                <Button
                  onClick={openReleaseNotes}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  What's New
                </Button>
              )}
              
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Later
              </Button>
            </div>
          </div>

          {/* Release Notes Preview */}
          {updateInfo.release_notes && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                What's New:
              </h4>
              <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {updateInfo.release_notes.length > 150 
                  ? `${updateInfo.release_notes.substring(0, 150)}...` 
                  : updateInfo.release_notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
