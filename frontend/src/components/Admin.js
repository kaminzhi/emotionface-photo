import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const Admin = () => {
  const [emotion, setEmotion] = useState("happy");
  const [file, setFile] = useState(null);
  const [emotions, setEmotions] = useState({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchEmotions = async () => {
    try {
      const response = await axios.get("/admin/emotions");
      setEmotions(response.data);
      setError("");
    } catch (err) {
      setError("無法獲取情緒列表");
    }
  };

  const handleUpload = async () => {
    if (!file || !emotion) {
      setError("請選擇情緒和檔案");
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append("emotion", emotion);
    formData.append("file", file);
    try {
      await axios.post("/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setError("");
      setFile(null);
      fetchEmotions();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        setError(errorDetail[0]?.msg || "上傳失敗");
      } else {
        setError(errorDetail || "上傳失敗");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (emotion, emoji_name) => {
    if (!window.confirm(`確定要刪除 ${emoji_name} 嗎？`)) return;
    try {
      await axios.post(
        "/admin/delete",
        new URLSearchParams({
          emotion,
          emoji_name,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );
      setError("");
      fetchEmotions();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        setError(errorDetail[0]?.msg || "刪除失敗");
      } else {
        setError(errorDetail || "刪除失敗");
      }
    }
  };

  useEffect(() => {
    fetchEmotions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 max-w-lg w-full"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          管理表情符號
        </h2>
        <div className="flex flex-col gap-3 mb-4">
          <select
            onChange={(e) => setEmotion(e.target.value)}
            value={emotion}
            className="border border-gray-300 rounded-md p-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="angry">憤怒</option>
            <option value="disgust">厭惡</option>
            <option value="fear">恐懼</option>
            <option value="happy">開心</option>
            <option value="sad">難過</option>
            <option value="neutral">中性</option>
            <option value="surprise">驚訝</option>
          </select>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-blue-700 transition focus:ring-2 focus:ring-primary focus:outline-none"
          />
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
          {isLoading ? "上傳中..." : "上傳"}
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
        <h3 className="text-lg font-bold text-gray-800 mt-6 mb-3 text-center">
          現有表情符號
        </h3>
        {Object.entries(emotions).map(([emo, emojis]) => (
          <div key={emo} className="mb-6">
            <h4 className="text-base font-semibold text-gray-700 mb-3 capitalize">
              {emo}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {emojis && emojis.length > 0 ? (
                emojis.map(({ name, base64 }, index) => (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    className="text-center bg-gray-50 p-3 rounded-md shadow-sm hover:shadow-md transition"
                  >
                    <img
                      src={`data:image/png;base64,${base64}`}
                      alt={name}
                      className="w-12 h-12 rounded-sm mx-auto"
                    />
                    <p className="text-sm text-gray-600 mt-1">{name}</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(emo, name)}
                      className="text-red-500 text-sm mt-1 hover:text-red-600 transition"
                    >
                      刪除
                    </motion.button>
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-500 col-span-full text-center text-sm">
                  無表情符號
                </p>
              )}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default Admin;
