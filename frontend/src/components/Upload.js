import React, { useState, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Chart from "./Chart";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      setError("");
    } else {
      setFile(null);
      setPreview(null);
      setError("請選擇一張圖片");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("請選擇照片");
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post(
        "http://localhost:8000/upload",
        formData,
      );
      setResult(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "處理失敗，請稍後再試");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (result?.processed_image) {
      const link = document.createElement("a");
      link.href = result.processed_image;
      link.download = "processed_image.png";
      link.click();
    }
  };

  const handleShare = () => {
    if (result?.processed_image) {
      window.location.href = `instagram://story-camera?image=${encodeURIComponent(result.processed_image)}`;
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 max-w-lg w-full"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          上傳你的照片
        </h2>
        <div className="mb-4">
          <div
            className="w-40 h-40 sm:w-48 sm:h-48 mx-auto bg-gray-100 rounded-lg shadow-sm flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary transition-colors"
            onClick={triggerFileInput}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <p className="text-gray-500 text-sm text-center px-2">
                點擊上傳照片
              </p>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col sm:flex-row gap-3 mt-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={triggerFileInput}
              className="btn-primary flex-1 text-sm"
            >
              從相簿選擇
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={triggerCameraInput}
              className="btn-secondary flex-1 text-sm"
            >
              相機拍照
            </motion.button>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleUpload}
          disabled={isLoading}
          className={`btn-primary w-full flex justify-center items-center ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-4 w-4 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
          ) : null}
          {isLoading ? "處理中..." : "提交"}
        </motion.button>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-red-500 mt-3 text-sm text-center"
          >
            {error}
          </motion.p>
        )}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-6"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
              辨識結果
            </h3>
            <p className="text-gray-600 mb-3 text-sm text-center">
              情緒:{" "}
              <span className="font-semibold text-primary">
                {result.emotion}
              </span>
            </p>
            <div className="flex justify-center mb-4">
              <img
                src={result.face_image}
                alt="Face"
                className="w-12 h-12 rounded-full shadow-sm border-2 border-primary"
              />
            </div>
            <Chart probabilities={result.probabilities} />
            <h4 className="text-base font-semibold text-gray-700 mt-4 mb-2">
              人體範圍
            </h4>
            <motion.img
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              src={result.human_mask_image}
              alt="Human Mask"
              className="max-w-xs h-auto rounded-md shadow-sm mb-4 mx-auto"
            />
            <h4 className="text-base font-semibold text-gray-700 mb-2">
              處理後圖片
            </h4>
            <motion.img
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              src={result.processed_image}
              alt="Processed"
              className="max-w-xs h-auto rounded-md shadow-sm mb-4 mx-auto"
            />
            <div className="flex flex-col gap-3 items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className="btn-secondary w-full max-w-xs text-sm"
              >
                下載
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="btn-primary w-full max-w-xs bg-gray-600 hover:bg-gray-700 text-sm"
              >
                分享到 Instagram
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Upload;
