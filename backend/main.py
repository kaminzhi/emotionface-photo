from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import mediapipe as mp
from PIL import Image
import io
import base64
import redis
import random
import tensorflow as tf
import logging
import os
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.Redis(host="redis", port=6379, decode_responses=True)
model = tf.keras.models.load_model("models/my_emotion_model.h5")
emotions = ["angry", "disgust", "fear", "happy", "sad", "neutral", "surprise"]
mp_selfie_segmentation = mp.solutions.selfie_segmentation.SelfieSegmentation(
    model_selection=1
)


def process_image(image: np.ndarray):
    try:
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        if face_cascade.empty():
            logger.error("Failed to load haarcascade_frontalface_default.xml")
            return None, None, "無法載入臉部偵測模型"
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        if len(faces) == 0:
            logger.warning("No faces detected in image")
            return None, None, "無法辨識到人臉"
        (x, y, w, h) = faces[0]
        face = gray[y : y + h, x : x + w]
        face = cv2.resize(face, (48, 48))
        face_input = face.reshape(1, 48, 48, 1) / 255.0
        probabilities = model.predict(face_input, verbose=0)[0]
        emotion_idx = np.argmax(probabilities)
        emotion = emotions[emotion_idx]
        return face, dict(zip(emotions, probabilities.tolist())), emotion
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return None, None, f"圖片處理失敗: {str(e)}"


def place_emojis(image: np.ndarray, emoji_path: str, num_placements: int = None):
    try:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = mp_selfie_segmentation.process(image_rgb)
        mask = results.segmentation_mask <= 0.5  # 背景區域
        emoji = Image.open(emoji_path).convert("RGBA")
        emoji = emoji.resize((64, 64), Image.Resampling.LANCZOS)  # 64x64
        output = Image.fromarray(image_rgb).convert("RGBA")
        human_mask_image = image_rgb.copy()
        human_mask = results.segmentation_mask > 0.5
        contours, _ = cv2.findContours(
            human_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        cv2.drawContours(human_mask_image, contours, -1, (0, 255, 0), 2)

        placed = 0
        positions = []
        h, w = image.shape[:2]
        num_placements = (
            random.randint(20, 30) if num_placements is None else num_placements
        )
        max_attempts = 100
        attempts = 0

        while placed < num_placements and attempts < max_attempts:
            x = random.randint(0, w - 64)
            y = random.randint(0, h - 64)
            if mask[y, x]:
                too_close = False
                for px, py in positions:
                    distance = ((x - px) ** 2 + (y - py) ** 2) ** 0.5
                    if distance < 100:
                        too_close = True
                        break
                if not too_close:
                    angle = random.randint(0, 360)
                    rotated_emoji = emoji.rotate(angle, expand=True)
                    output.paste(rotated_emoji, (x, y), rotated_emoji)
                    positions.append((x, y))
                    placed += 1
            attempts += 1

        if placed < num_placements:
            logger.warning(f"Only placed {placed} emojis due to space constraints")

        processed_image = cv2.cvtColor(np.array(output), cv2.COLOR_RGBA2BGR)
        human_mask_image = cv2.cvtColor(human_mask_image, cv2.COLOR_RGB2BGR)
        return processed_image, human_mask_image
    except Exception as e:
        logger.error(f"Error placing emojis: {str(e)}")
        raise


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            logger.error("Failed to decode image")
            return JSONResponse(
                content={"error": "無法解析圖片"},
                status_code=400,
                headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
            )
        face, probabilities, emotion = process_image(image)
        if face is None:
            return JSONResponse(
                content={"error": emotion},
                status_code=400,
                headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
            )
        emoji_paths = redis_client.lrange(f"emotion:{emotion}", 0, -1)
        if not emoji_paths:
            logger.warning(f"No emojis found for emotion: {emotion}")
            return JSONResponse(
                content={"error": f"無{emotion}的表情符號"},
                status_code=400,
                headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
            )
        emoji_path = random.choice(emoji_paths)
        processed_image, human_mask_image = place_emojis(image, emoji_path)
        _, face_buffer = cv2.imencode(".png", face)
        _, processed_buffer = cv2.imencode(".png", processed_image)
        _, human_mask_buffer = cv2.imencode(".png", human_mask_image)
        face_base64 = base64.b64encode(face_buffer).decode("utf-8")
        processed_base64 = base64.b64encode(processed_buffer).decode("utf-8")
        human_mask_base64 = base64.b64encode(human_mask_buffer).decode("utf-8")
        return {
            "face_image": f"data:image/png;base64,{face_base64}",
            "emotion": emotion,
            "probabilities": probabilities,
            "processed_image": f"data:image/png;base64,{processed_base64}",
            "human_mask_image": f"data:image/png;base64,{human_mask_base64}",
        }
    except Exception as e:
        logger.error(f"Error in /upload endpoint: {str(e)}")
        return JSONResponse(
            content={"error": f"處理失敗: {str(e)}"},
            status_code=500,
            headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
        )


@app.post("/admin/upload")
async def admin_upload(emotion: str = Form(...), file: UploadFile = File(...)):
    if emotion not in emotions:
        logger.error(f"Invalid emotion: {emotion}")
        raise HTTPException(status_code=400, detail=f"無效的情緒: {emotion}")
    try:
        # 確定檔案副檔名
        ext = Path(file.filename).suffix.lower()
        if ext not in [".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="僅支援 JPG 或 PNG 檔案")

        # 檢查現有檔案，生成新檔名
        emoji_dir = "static/emojis"
        os.makedirs(emoji_dir, exist_ok=True)
        existing_files = redis_client.lrange(f"emotion:{emotion}", 0, -1)
        index = 1
        while True:
            new_filename = f"{emotion}_{index}{ext}"
            new_filepath = os.path.join(emoji_dir, new_filename)
            if new_filepath not in existing_files:
                break
            index += 1

        # 儲存檔案
        with open(new_filepath, "wb") as f:
            f.write(await file.read())
        redis_client.lpush(f"emotion:{emotion}", new_filepath)
        return {"message": f"成功上傳到 {emotion}，檔案名: {new_filename}"}
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"檔案上傳失敗: {str(e)}")


@app.post("/admin/delete")
async def admin_delete(emotion: str = Form(...), filename: str = Form(...)):
    if emotion not in emotions:
        logger.error(f"Invalid emotion: {emotion}")
        raise HTTPException(status_code=400, detail=f"無效的情緒: {emotion}")
    try:
        filepath = filename
        if filepath not in redis_client.lrange(f"emotion:{emotion}", 0, -1):
            raise HTTPException(status_code=404, detail="檔案不存在")
        if os.path.exists(filepath):
            os.remove(filepath)
        redis_client.lrem(f"emotion:{emotion}", 0, filepath)
        return {"message": f"成功刪除 {filepath}"}
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"檔案刪除失敗: {str(e)}")


@app.get("/admin/emotions")
async def get_emotions():
    result = {}
    for emotion in emotions:
        result[emotion] = redis_client.lrange(f"emotion:{emotion}", 0, -1)
    return result


@app.get("/static/emojis/{filename}")
async def get_emoji(filename: str):
    filepath = os.path.join("static/emojis", filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="檔案不存在")
    return FileResponse(filepath)
