import React, { useState, useEffect } from "react";
import axios from "axios";

const Admin = () => {
  const [emotion, setEmotion] = useState("happy");
  const [file, setFile] = useState(null);
  const [emotions, setEmotions] = useState({});
  const [error, setError] = useState("");

  const fetchEmotions = async () => {
    try {
      const response = await axios.get("http://localhost:8000/admin/emotions");
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
    const formData = new FormData();
    formData.append("emotion", emotion);
    formData.append("file", file);
    try {
      await axios.post("http://localhost:8000/admin/upload", formData, {
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
    }
  };

  const handleDelete = async (emotion, emoji_name) => {
    if (!window.confirm(`確定要刪除 ${emoji_name} 嗎？`)) return;
    try {
      await axios.post(
        "http://localhost:8000/admin/delete",
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
    <div style={{ padding: "20px" }}>
      <h2>管理表情符號</h2>
      <select onChange={(e) => setEmotion(e.target.value)} value={emotion}>
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
      />
      <button onClick={handleUpload}>上傳</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <h3>現有表情符號</h3>
      {Object.entries(emotions).map(([emo, emojis]) => (
        <div key={emo}>
          <h4>{emo}</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {emojis && emojis.length > 0 ? (
              emojis.map(({ name, base64 }) => (
                <div key={name} style={{ textAlign: "center" }}>
                  <img
                    src={`data:image/png;base64,${base64}`}
                    alt={name}
                    style={{ width: "64px", height: "64px" }}
                  />
                  <p>{name}</p>
                  <button
                    onClick={() => handleDelete(emo, name)}
                    style={{ color: "red" }}
                  >
                    刪除
                  </button>
                </div>
              ))
            ) : (
              <p>無表情符號</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Admin;
