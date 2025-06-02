from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import mediapipe as mp
from PIL import Image, ImageDraw
import io
import base64
import redis
import random
import tensorflow as tf
import logging
from sklearn.cluster import KMeans
import colorsys

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


def get_complementary_color(rgb):
    """Convert RGB to HSV, get complementary color (180° hue shift), convert back to RGB."""
    r, g, b = [x / 255.0 for x in rgb]
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    h = (h + 0.5) % 1.0  # Shift hue by 180°
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return int(r * 255), int(g * 255), int(b * 255)


def place_emojis(image: np.ndarray, emoji_entries: dict, num_placements: int = None):
    try:
        emoji_size = 70
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = mp_selfie_segmentation.process(image_rgb)
        mask = results.segmentation_mask <= 0.5  # Background: True, Human: False
        # Add buffer around human area
        kernel = np.ones((10, 10), np.uint8)
        human_mask = results.segmentation_mask > 0.5
        human_mask = cv2.dilate(human_mask.astype(np.uint8), kernel, iterations=1)
        mask = ~human_mask.astype(bool)

        # Get dominant background color
        background_pixels = image_rgb[mask]
        if len(background_pixels) == 0:
            logger.warning("No background pixels found, using default color")
            overlay_color = (135, 206, 250, 100)  # Fallback: light blue, 50% opacity
        else:
            kmeans = KMeans(n_clusters=1, random_state=0).fit(background_pixels)
            dominant_color = kmeans.cluster_centers_[0].astype(int)
            # Get complementary color
            comp_color = get_complementary_color(dominant_color)
            overlay_color = (*comp_color, 100)  # 50% opacity

        # Create output image
        output = Image.fromarray(image_rgb).convert("RGBA")
        h, w = image.shape[:2]

        # Create semi-transparent layer
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        for y in range(h):
            for x in range(w):
                if mask[y, x]:
                    overlay_draw.point((x, y), fill=overlay_color)
        output = Image.alpha_composite(output, overlay)

        # Create human mask image
        human_mask_image = image_rgb.copy()
        contours, _ = cv2.findContours(
            human_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        cv2.drawContours(human_mask_image, contours, -1, (0, 255, 0), 2)

        placed = 0
        positions = []
        num_placements = (
            random.randint(30, 40) if num_placements is None else num_placements
        )
        max_attempts = 200
        attempts = 0
        emoji_list = list(emoji_entries.items())
        if not emoji_list:
            logger.error("No emojis provided for placement")
            raise ValueError("No emojis available for placement")

        failed_reasons = {"human_overlap": 0, "too_close": 0, "out_of_bounds": 0}
        while placed < num_placements and attempts < max_attempts:
            x = random.randint(0, w - emoji_size)
            y = random.randint(0, h - emoji_size)
            x_end = min(x + emoji_size, w)
            y_end = min(y + emoji_size, h)
            if x_end - x < emoji_size or y_end - y < emoji_size:
                failed_reasons["out_of_bounds"] += 1
                attempts += 1
                continue
            emoji_area = mask[y:y_end, x:x_end]
            # Allow placement if ≥90% of area is background
            if np.mean(emoji_area) >= 0.9:
                too_close = False
                for px, py in positions:
                    distance = ((x - px) ** 2 + (y - py) ** 2) ** 0.5
                    if distance < emoji_size + 5:
                        too_close = True
                        failed_reasons["too_close"] += 1
                        break
                if not too_close:
                    emoji_name, emoji_base64 = random.choice(emoji_list)
                    logger.info(f"Placing emoji {emoji_name} at position ({x}, {y})")
                    emoji_data = base64.b64decode(emoji_base64)
                    emoji = Image.open(io.BytesIO(emoji_data)).convert("RGBA")
                    emoji = emoji.resize(
                        (emoji_size, emoji_size), Image.Resampling.LANCZOS
                    )
                    angle = random.randint(0, 360)
                    rotated_emoji = emoji.rotate(angle, expand=True)
                    output.paste(rotated_emoji, (x, y), rotated_emoji)
                    positions.append((x, y))
                    placed += 1
            else:
                failed_reasons["human_overlap"] += 1
            attempts += 1

        logger.info(f"Placed {placed} emojis out of {num_placements} requested")
        logger.info(f"Failed reasons: {failed_reasons}")
        if placed < num_placements:
            logger.warning(
                f"Only placed {placed} emojis out of {num_placements} requested"
            )

        processed_image = cv2.cvtColor(np.array(output), cv2.COLOR_RGBA2BGR)
        human_mask_image = cv2.cvtColor(human_mask_image, cv2.COLOR_RGB2BGR)
        return processed_image, human_mask_image
    except Exception as e:
        logger.error(f"Error placing emojis: {str(e)}")
        raise


@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...), compression_quality: int = Form(default=80)
):
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
        max_width = 800
        if image.shape[1] > max_width:
            scale = max_width / image.shape[1]
            new_height = int(image.shape[0] * scale)
            image = cv2.resize(
                image, (max_width, new_height), interpolation=cv2.INTER_AREA
            )
            logger.info(f"Resized input image to {max_width}x{new_height}")

        face, probabilities, emotion = process_image(image)
        if face is None:
            return JSONResponse(
                content={"error": emotion},
                status_code=400,
                headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
            )
        emoji_entries = redis_client.hgetall(f"emotion:{emotion}")
        logger.info(f"Emotion detected: {emotion}")
        logger.info(
            f"Found {len(emoji_entries)} emojis for emotion {emotion}: {list(emoji_entries.keys())}"
        )
        if not emoji_entries:
            logger.warning(f"No emojis found for emotion: {emotion}")
            return JSONResponse(
                content={"error": f"無{emotion}的表情符號"},
                status_code=400,
                headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
            )
        for name, base64_data in emoji_entries.items():
            logger.info(f"Emoji {name}: {base64_data[:30]}...")
        processed_image, human_mask_image = place_emojis(image, emoji_entries)
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), compression_quality]
        _, face_buffer = cv2.imencode(".png", face)
        _, processed_buffer = cv2.imencode(".jpg", processed_image, encode_params)
        _, human_mask_buffer = cv2.imencode(".jpg", human_mask_image, encode_params)
        face_base64 = base64.b64encode(face_buffer).decode("utf-8")
        processed_base64 = base64.b64encode(processed_buffer).decode("utf-8")
        human_mask_base64 = base64.b64encode(human_mask_buffer).decode("utf-8")
        return {
            "face_image": f"data:image/png;base64,{face_base64}",
            "emotion": emotion,
            "probabilities": probabilities,
            "processed_image": f"data:image/jpeg;base64,{processed_base64}",
            "human_mask_image": f"data:image/jpeg;base64,{human_mask_base64}",
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
        ext = file.filename.lower().split(".")[-1]
        if ext not in ["jpg", "jpeg", "png"]:
            raise HTTPException(status_code=400, detail="僅支援 JPG 或 PNG 檔案")
        contents = await file.read()
        emoji_base64 = base64.b64encode(contents).decode("utf-8")
        existing_emojis = redis_client.hkeys(f"emotion:{emotion}")
        index = 1
        while f"{emotion}{index}" in existing_emojis:
            index += 1
        emoji_name = f"{emotion}{index}"
        redis_client.hset(f"emotion:{emotion}", emoji_name, emoji_base64)
        return {"message": f"成功上傳到 {emotion}，名稱: {emoji_name}"}
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"檔案上傳失敗: {str(e)}")


@app.post("/admin/delete")
async def admin_delete(emotion: str = Form(...), emoji_name: str = Form(...)):
    if emotion not in emotions:
        logger.error(f"Invalid emotion: {emotion}")
        raise HTTPException(status_code=400, detail=f"無效的情緒: {emotion}")
    try:
        if not redis_client.hexists(f"emotion:{emotion}", emoji_name):
            raise HTTPException(status_code=404, detail="表情符號不存在")
        redis_client.hdel(f"emotion:{emotion}", emoji_name)
        return {"message": f"成功刪除 {emoji_name}"}
    except Exception as e:
        logger.error(f"Error deleting emoji: {str(e)}")
        raise HTTPException(status_code=500, detail=f"檔案刪除失敗: {str(e)}")


@app.get("/admin/emotions")
async def get_emotions():
    result = {}
    for emotion in emotions:
        emojis = redis_client.hgetall(f"emotion:{emotion}")
        result[emotion] = [
            {"name": name, "base64": base64_data}
            for name, base64_data in emojis.items()
        ]
    return result
