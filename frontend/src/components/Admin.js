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
      await axios.post("http://localhost:8000/admin/upload", formData);
      setError("");
      fetchEmotions();
    } catch (err) {
      setError("上傳失敗");
    }
  };

  useEffect(() => {
    fetchEmotions();
  }, []);

  return (
    <div>
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
      {Object.entries(emotions).map(([emo, files]) => (
        <div key={emo}>
          <h4>{emo}</h4>
          <ul>
            {files.map((file, index) => (
              <li key={index}>{file}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Admin;
