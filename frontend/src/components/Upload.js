import React, { useState } from "react";
import axios from "axios";
import Chart from "./Chart";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setError("請選擇照片");
      return;
    }
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
      setError(err.response?.data?.error || "處理失敗");
      setResult(null);
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

  return (
    <div>
      <h2>上傳照片</h2>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload}>提交</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {result && (
        <div>
          <h3>辨識結果</h3>
          <p>情緒: {result.emotion}</p>
          <img
            src={result.face_image}
            alt="Face"
            style={{ width: "48px", height: "48px" }}
          />
          <Chart probabilities={result.probabilities} />
          <img
            src={result.processed_image}
            alt="Processed"
            style={{ maxWidth: "300px" }}
          />
          <button onClick={handleDownload}>下載</button>
          <button onClick={handleShare}>分享到Instagram</button>
        </div>
      )}
    </div>
  );
};

export default Upload;
