import { Check, Loader2, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { uploadBase64File } from '../utils/fileUploadUtils';
import { useDialog } from './dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (fileUrl: string) => void;
  fileType?: string;
  acceptTypes?: string;
  title?: string;
}

const FileUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  fileType = 'image',
  acceptTypes = 'image/png,image/jpeg,image/jpg',
  title = '上传图片'
}) => {
  const dialog = useDialog();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadSuccess(false);
    }
  }, [isOpen]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = acceptTypes.split(',');
    if (!validTypes.includes(file.type)) {
      await dialog.alert({ title: '错误', message: '请选择 PNG 或 JPG 格式的图片', type: 'error' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      await dialog.alert({ title: '错误', message: '文件大小不能超过 10MB', type: 'error' });
      return;
    }

    setSelectedFile(file);
    setUploadSuccess(false);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !previewUrl) return;

    setUploading(true);
    try {
      const result = await uploadBase64File(previewUrl, fileType);

      if (result.success && result.data?.url) {
        setUploadSuccess(true);
        onUploadSuccess(result.data.url);
        // Close modal after short delay
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        await dialog.alert({ title: '错误', message: result.error || '上传失败，请重试', type: 'error' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      await dialog.alert({ title: '错误', message: '上传失败，请重试', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
      <div className="bg-[#0f0f23] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#0e1230]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
            disabled={uploading}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!previewUrl ? (
            <>
              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-900/50 transition-all"
              >
                <Upload className="w-12 h-12 text-slate-600 mb-4" />
                <p className="text-slate-400 text-sm font-medium mb-2">点击选择文件</p>
                <p className="text-slate-600 text-xs">支持 PNG、JPG 格式，最大 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptTypes}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </>
          ) : (
            <>
              {/* Preview Area */}
              <div className="space-y-4">
                <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  {uploadSuccess && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <div className="bg-green-500 text-white p-3 rounded-full">
                        <Check className="w-8 h-8" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-[#0e0e28] rounded-lg border border-slate-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {selectedFile?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile?.size || 0) / 1024 < 1024
                        ? `${((selectedFile?.size || 0) / 1024).toFixed(1)} KB`
                        : `${((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB`
                      }
                    </p>
                  </div>
                  {!uploadSuccess && (
                    <button
                      onClick={handleRemoveFile}
                      className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-slate-800 flex items-center justify-between bg-[#0e1230]">
          <button
            onClick={handleRemoveFile}
            disabled={!previewUrl || uploadSuccess || uploading}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            重新选择
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            {previewUrl && !uploadSuccess && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    上传
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
