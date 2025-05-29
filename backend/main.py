from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import mediapipe as mp
from PIL import Image
import io
import base64
import redis
import random
import tensorflow as tf

app = FastAPI()
redis_client = redis.Redis(host="redis", port=6379, decode_responses=True)
model = tf.keras.models.load_model("models/my_emotion_model.h5")
emotions = ["angry", "disgust", "fear", "happy", "sad", "neutral", "surprise"]
mp_selfie_segmentation = mp.solutions.selfie_segmentation.SelfieSegmentation(
    model_selection=1
)


def process_image(image: np.ndarray):
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
    )
    if len(faces) == 0:
        return None, None, "無法辨識到人臉"
    (x, y, w, h) = faces[0]
    face = gray[y : y + h, x : x + w]
    face = cv2.resize(face, (48, 48))
    face_input = face.reshape(1, 48, 48, 1) / 255.0
    probabilities = model.predict(face_input)[0]
    emotion_idx = np.argmax(probabilities)
    emotion = emotions[emotion_idx]
    return face, dict(zip(emotions, probabilities.tolist())), emotion


def place_emojis(image: np.ndarray, emoji_path: str, num_placements: int = 3):
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = mp_selfie_segmentation.process(image_rgb)
    mask = results.segmentation_mask > 0.5
    emoji = Image.open(emoji_path).convert("RGBA")
    output = Image.fromarray(image_rgb).convert("RGBA")
    placed = 0
    positions = []
    h, w = image.shape[:2]
    while placed < num_placements:
        x = random.randint(0, w - emoji.width)
        y = random.randint(0, h - emoji.height)
        if mask[y, x]:
            too_close = False
            for px, py in positions:
                if ((x - px) ** 2 + (y - py) ** 2) ** 0.5 < 50:
                    too_close = True
                    break
            if not too_close:
                angle = random.randint(0, 360)
                rotated_emoji = emoji.rotate(angle, expand=True)
                output.paste(rotated_emoji, (x, y), rotated_emoji)
                positions.append((x, y))
                placed += 1
    return cv2.cvtColor(np.array(output), cv2.COLOR_RGBA2BGR)


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    face, probabilities, emotion = process_image(image)
    if face is None:
        return JSONResponse(content={"error": emotion}, status_code=400)
    emoji_paths = redis_client.lrange(f"emotion:{emotion}", 0, -1)
    if not emoji_paths:
        return JSONResponse(
            content={"error": f"無{emotion}的表情符號"}, status_code=400
        )
    emoji_path = random.choice(emoji_paths)
    processed_image = place_emojis(image, emoji_path)
    _, face_buffer = cv2.imencode(".png", face)
    _, processed_buffer = cv2.imencode(".png", processed_image)
    face_base64 = base64.b64encode(face_buffer).decode("utf-8")
    processed_base64 = base64.b64encode(processed_buffer).decode("utf-8")
    return {
        "face_image": f"data:image/png;base64,{face_base64}",
        "emotion": emotion,
        "probabilities": probabilities,
        "processed_image": f"data:image/png;base64,{processed_base64}",
    }


@app.post("/admin/upload")
async def admin_upload(emotion: str, file: UploadFile = File(...)):
    if emotion not in emotions:
        raise HTTPException(status_code=400, detail="無效的情緒")
    file_path = f"static/emojis/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    redis_client.lpush(f"emotion:{emotion}", file_path)
    return {"message": f"成功上傳到{emotion}"}


@app.get("/admin/emotions")
async def get_emotions():
    result = {}
    for emotion in emotions:
        result[emotion] = redis_client.lrange(f"emotion:{emotion}", 0, -1)
    return result
