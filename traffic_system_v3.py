"""
Smart Traffic Analytics System v3 — Accuracy Upgrades + Live Streaming
=========================================================================
New in v3:
1. Higher inference resolution (imgsz=1280) — smaller/farther vehicles detected
2. Per-class confidence thresholds — motorcycles need lower conf (smaller, occluded more)
3. CLAHE contrast enhancement — recovers detail in night/glare footage before inference
4. Track confirmation window — a vehicle must appear in N consecutive frames before
   being counted, filtering out flicker/false positives from a single bad frame
5. Test-time augmentation option (--augment) — flips/scales input for higher accuracy
   at the cost of ~2x inference time (use for offline processing, not real-time)
6. Pushes every confirmed event to the FastAPI/Express backend via HTTP POST,
   which then broadcasts it to the dashboard over WebSocket in real time

Requirements:
    pip install ultralytics opencv-python numpy requests --break-system-packages

Usage:
    python traffic_system_v3.py --source video.mp4 --output out.mp4 --api http://localhost:3000
"""

import argparse
import time
from collections import defaultdict, deque

import cv2
import numpy as np
import requests
from ultralytics import YOLO

VEHICLE_CLASSES = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
COLORS = {"car": (0, 255, 0), "motorcycle": (255, 0, 255),
          "bus": (0, 165, 255), "truck": (255, 255, 0)}

# lower threshold for smaller/harder-to-see classes
PER_CLASS_CONF = {"car": 0.40, "truck": 0.40, "bus": 0.40, "motorcycle": 0.28}

CONFIRM_FRAMES = 3  # vehicle must persist this many frames before it counts


def enhance_frame(frame):
    """CLAHE on the luminance channel — improves detection in low light/glare
    without blowing out already well-lit areas."""
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


class SpeedEstimator:
    def __init__(self, src_points, real_width_m, real_height_m):
        dst = np.array([[0, 0], [real_width_m, 0],
                        [real_width_m, real_height_m], [0, real_height_m]], dtype=np.float32)
        self.matrix = cv2.getPerspectiveTransform(np.array(src_points, dtype=np.float32), dst)

    def to_world(self, point):
        return cv2.perspectiveTransform(np.array([[point]], dtype=np.float32), self.matrix)[0][0]

    def speed_kmh(self, p1, p2, dt):
        if dt <= 0:
            return 0.0
        return (np.linalg.norm(self.to_world(p2) - self.to_world(p1)) / dt) * 3.6


def push_event(api_url, event):
    if not api_url:
        return
    try:
        requests.post(f"{api_url}/events", json=event, timeout=0.5)
    except requests.exceptions.RequestException:
        pass  # backend down shouldn't crash the vision pipeline


def run(source, output_path, counting_line_y, speed_limit_kmh, model_name,
        calibration, api_url, augment):

    model = YOLO(model_name)
    cap = cv2.VideoCapture(int(source) if source.isdigit() else source)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open source: {source}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    writer = None
    if output_path:
        writer = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))

    speed_estimator = SpeedEstimator(calibration["points"], calibration["width_m"], calibration["height_m"]) if calibration else None

    track_history = defaultdict(lambda: deque(maxlen=8))
    frame_streak = defaultdict(int)     # consecutive frames seen -> for confirmation
    confirmed = set()
    crossed = defaultdict(set)
    counts = defaultdict(int)
    violations = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        enhanced = enhance_frame(frame)
        min_conf = min(PER_CLASS_CONF.values())
        results = model.track(enhanced, persist=True, conf=min_conf, imgsz=1280,
                               classes=list(VEHICLE_CLASSES.keys()), tracker="botsort.yaml",
                               augment=augment, verbose=False)
        result = results[0]

        seen_this_frame = set()

        if result.boxes is not None and result.boxes.id is not None:
            boxes = result.boxes.xyxy.cpu().numpy()
            ids = result.boxes.id.cpu().numpy().astype(int)
            clss = result.boxes.cls.cpu().numpy().astype(int)
            confs = result.boxes.conf.cpu().numpy()

            for box, tid, cls_id, conf in zip(boxes, ids, clss, confs):
                if cls_id not in VEHICLE_CLASSES:
                    continue
                label = VEHICLE_CLASSES[cls_id]
                if conf < PER_CLASS_CONF[label]:
                    continue  # per-class threshold, applied after tracking for stability

                seen_this_frame.add(tid)
                frame_streak[tid] += 1
                if frame_streak[tid] >= CONFIRM_FRAMES:
                    confirmed.add(tid)

                color = COLORS[label]
                x1, y1, x2, y2 = map(int, box)
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                now = time.time()
                track_history[tid].append(((cx, cy), now))

                speed = 0.0
                if speed_estimator and len(track_history[tid]) >= 2:
                    p1, t1 = track_history[tid][0]
                    p2, t2 = track_history[tid][-1]
                    speed = speed_estimator.speed_kmh(p1, p2, t2 - t1)

                direction = None
                if tid in confirmed and len(track_history[tid]) >= 2:
                    prev_y = track_history[tid][-2][0][1]
                    if prev_y < counting_line_y <= cy:
                        direction = "south"
                    elif prev_y > counting_line_y >= cy:
                        direction = "north"

                if direction and tid not in crossed[direction]:
                    crossed[direction].add(tid)
                    counts[f"{label}_{direction}"] += 1
                    is_violation = speed > speed_limit_kmh
                    if is_violation:
                        violations += 1
                    push_event(api_url, {
                        "track_id": int(tid), "vehicle_type": label,
                        "speed_kmh": round(float(speed), 1), "direction": direction,
                        "violation": bool(is_violation), "timestamp": now,
                    })

                # unconfirmed tracks drawn dimmer, confirmed ones drawn solid
                thickness = 2 if tid in confirmed else 1
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)
                cv2.putText(frame, f"{label} #{tid} {speed:.0f}km/h", (x1, max(y1 - 8, 0)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # decay streaks for tracks not seen this frame (handles brief occlusion gracefully)
        for tid in list(frame_streak):
            if tid not in seen_this_frame:
                frame_streak[tid] = max(0, frame_streak[tid] - 1)

        cv2.line(frame, (0, counting_line_y), (width, counting_line_y), (0, 0, 255), 2)
        if writer:
            writer.write(frame)

    cap.release()
    if writer:
        writer.release()
    print("Counts:", dict(counts))
    print("Violations:", violations)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True)
    p.add_argument("--output", default="output.mp4")
    p.add_argument("--line_y", type=int, default=300)
    p.add_argument("--speed_limit", type=float, default=60.0)
    p.add_argument("--model", default="yolo11m.pt", help="Use *m* or *l* variant for better accuracy than nano")
    p.add_argument("--api", default="http://localhost:3000", help="Backend URL, empty string to disable")
    p.add_argument("--augment", action="store_true", help="Test-time augmentation (slower, more accurate)")
    args = p.parse_args()

    calibration = {
        "points": [(400, 200), (900, 200), (1100, 700), (200, 700)],
        "width_m": 10, "height_m": 30,
    }

    run(args.source, args.output, args.line_y, args.speed_limit, args.model,
        calibration, args.api or None, args.augment)
