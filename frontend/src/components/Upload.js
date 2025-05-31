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
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
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
      setShowOptions(false);
    } else {
      setFile(null);
      setPreview(null);
      setError("請選擇一張圖片");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(droppedFile);
      setError("");
    } else {
      setError("請上傳圖片檔案");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
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
      const response = await axios.post("/upload", formData);
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

  const triggerInput = (ref) => {
    ref.current.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-0 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl shadow-xl p-8 w-[100vw] max-w-[640px] sm:p-6 sm:max-w-2xl flex flex-col items-center"
      >
        <h2 className="text-4xl sm:text-3xl font-bold text-gray-800 mb-10 text-center">
          上傳你的照片
        </h2>
        <div className="mb-10 sm:mb-8">
          <div
            className="w-11/12 aspect-square max-w-[300px] sm:max-w-[240px] mx-auto bg-gray-100 rounded-3xl shadow-xl flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary transition-colors"
            onClick={() => setShowOptions(true)}
            onDrop={window.innerWidth >= 640 ? handleDrop : undefined}
            onDragOver={window.innerWidth >= 640 ? handleDragOver : undefined}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover rounded-3xl"
              />
            ) : (
              <p className="text-gray-500 text-2xl sm:text-xl text-center px-4">
                {window.innerWidth < 640 ? "點擊上傳照片" : "點擊或拖放圖片"}
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
            ref={galleryInputRef}
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
          {showOptions && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
              onClick={() => setShowOptions(false)}
            >
              <div
                className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-[640px] sm:max-w-md p-6 sm:p-8 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl sm:text-xl font-semibold text-gray-800 mb-8 text-center">
                  選擇上傳方式
                </h3>
                <div className="flex flex-col gap-8 sm:gap-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => triggerInput(fileInputRef)}
                    className="btn-primary"
                  >
                    從檔案選擇
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => triggerInput(galleryInputRef)}
                    className="btn-primary"
                  >
                    從相簿選擇
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => triggerInput(cameraInputRef)}
                    className="btn-secondary"
                  >
                    相機拍照
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowOptions(false)}
                    className="btn-primary bg-gray-600 hover:bg-gray-700"
                  >
                    取消
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
          {window.innerWidth >= 640 && (
            <p className="text-gray-500 text-sm text-center mt-4">
              支援 JPG、PNG 格式
            </p>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleUpload}
          disabled={isLoading}
          className={`btn-primary w-full max-w-xl sm:max-w-lg flex justify-center items-center ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-6 w-6 mr-3 text-white"
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
            className="text-red-500 mt-4 text-2xl sm:text-lg text-center"
          >
            {error}
          </motion.p>
        )}
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-8"
          >
            <h3 className="text-3xl sm:text-2xl font-bold text-gray-800 mb-6 text-center">
              辨識結果
            </h3>
            <p className="text-gray-600 mb-6 text-2xl sm:text-lg text-center">
              情緒:{" "}
              <span className="font-semibold text-primary">
                {result.emotion}
              </span>
            </p>
            <div className="flex justify-center mb-6">
              <img
                src={result.face_image}
                alt="Face"
                className="w-24 h-24 sm:w-16 sm:h-16 rounded-full shadow-md border-2 border-primary"
              />
            </div>
            <Chart probabilities={result.probabilities} />
            <h4 className="text-2xl sm:text-xl font-semibold text-gray-700 mt-6 mb-4">
              人體範圍
            </h4>
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              src={result.human_mask_image}
              alt="Human Mask"
              className="max-w-[100vw] sm:max-w-md h-auto rounded-lg shadow-md mb-6 mx-auto"
            />
            <h4 className="text-2xl sm:text-xl font-semibold text-gray-700 mb-4">
              處理後圖片
            </h4>
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              src={result.processed_image}
              alt="Processed"
              className="max-w-[100vw] sm:max-w-md h-auto rounded-lg shadow-md mb-6 mx-auto"
            />
            <div className="flex flex-col gap-6 items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className="btn-secondary w-full max-w-xl sm:max-w-lg"
              >
                下載
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="btn-primary w-full max-w-xl sm:max-w-lg bg-gray-600 hover:bg-gray-700"
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
