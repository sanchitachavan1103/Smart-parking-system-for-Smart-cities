"""
Smart Parking System - Flask Backend
City Centre IoT Parking Management
"""

from flask import Flask, jsonify, render_template, request
from datetime import datetime
import random
import json

app = Flask(__name__)

# ──────────────────────────────────────────────
# Parking State
# ──────────────────────────────────────────────

TOTAL_SLOTS = 40

# Initialize: first 3 occupied, rest free
parking_slots = {i: {"id": i + 1, "status": "filled" if i < 3 else "empty"} for i in range(TOTAL_SLOTS)}

vehicle_log = []   # activity log
entered_today = 0
exited_today  = 0
entry_gate_open = False
exit_gate_open  = False


def get_stats():
    free = sum(1 for s in parking_slots.values() if s["status"] == "empty")
    occ  = TOTAL_SLOTS - free
    pct  = round((occ / TOTAL_SLOTS) * 100, 1)
    return {
        "total": TOTAL_SLOTS,
        "available": free,
        "occupied": occ,
        "occupancy_pct": pct,
        "entered_today": entered_today,
        "exited_today": exited_today,
        "entry_gate_open": entry_gate_open,
        "exit_gate_open":  exit_gate_open,
        "status": "FULL — NO ENTRY" if free == 0 else "OPEN",
    }


def add_log(event_type, message):
    vehicle_log.insert(0, {
        "time": datetime.now().strftime("%H:%M:%S"),
        "type": event_type,
        "message": message,
    })
    if len(vehicle_log) > 50:
        vehicle_log.pop()


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    return jsonify({
        "stats": get_stats(),
        "slots": list(parking_slots.values()),
        "log":   vehicle_log[:20],
    })


@app.route("/api/entry", methods=["POST"])
def api_entry():
    global entered_today, entry_gate_open
    free_slots = [i for i, s in parking_slots.items() if s["status"] == "empty"]
    if not free_slots:
        return jsonify({"success": False, "message": "Parking full — entry denied"})

    slot_idx = free_slots[0]
    parking_slots[slot_idx]["status"] = "filled"
    entered_today += 1
    entry_gate_open = True
    add_log("enter", f"Vehicle entered — Slot {slot_idx + 1} allocated")
    return jsonify({"success": True, "slot": slot_idx + 1, "stats": get_stats()})


@app.route("/api/exit", methods=["POST"])
def api_exit():
    global exited_today, exit_gate_open
    filled_slots = [i for i, s in parking_slots.items() if s["status"] == "filled"]
    if not filled_slots:
        return jsonify({"success": False, "message": "No vehicles to exit"})

    slot_idx = filled_slots[0]
    parking_slots[slot_idx]["status"] = "empty"
    exited_today += 1
    exit_gate_open = True
    add_log("exit", f"Vehicle exited — Slot {slot_idx + 1} freed")
    return jsonify({"success": True, "slot": slot_idx + 1, "stats": get_stats()})


@app.route("/api/toggle_slot/<int:slot_id>", methods=["POST"])
def toggle_slot(slot_id):
    idx = slot_id - 1
    if idx < 0 or idx >= TOTAL_SLOTS:
        return jsonify({"success": False, "message": "Invalid slot"})
    prev = parking_slots[idx]["status"]
    parking_slots[idx]["status"] = "empty" if prev == "filled" else "filled"
    add_log("sys", f"Slot {slot_id} manually set to {parking_slots[idx]['status']}")
    return jsonify({"success": True, "slot": slot_id, "status": parking_slots[idx]["status"], "stats": get_stats()})


@app.route("/api/gate_close", methods=["POST"])
def gate_close():
    global entry_gate_open, exit_gate_open
    entry_gate_open = False
    exit_gate_open  = False
    return jsonify({"success": True})


@app.route("/api/simulate_random", methods=["POST"])
def simulate_random():
    """Simulate IoT sensor — fills next empty slot in order."""
    global entered_today
    changes = []

    # Get next empty slot in order (lowest number first)
    next_slot = next((i for i in range(TOTAL_SLOTS) if parking_slots[i]["status"] == "empty"), None)

    if next_slot is None:
        return jsonify({"success": False, "message": "No empty slots to occupy", "stats": get_stats(), "slots": list(parking_slots.values())})

    parking_slots[next_slot]["status"] = "filled"
    entered_today += 1
    changes.append(f"Slot {next_slot + 1}: empty → filled")
    add_log("enter", f"[IoT Sensor] Slot {next_slot + 1} occupied")

    return jsonify({"success": True, "changes": changes, "stats": get_stats(), "slots": list(parking_slots.values())})


@app.route("/api/reset", methods=["POST"])
def reset():
    global entered_today, exited_today, entry_gate_open, exit_gate_open
    for i in range(TOTAL_SLOTS):
        parking_slots[i]["status"] = "filled" if i < 3 else "empty"
    entered_today = 0
    exited_today  = 0
    entry_gate_open = False
    exit_gate_open  = False
    vehicle_log.clear()
    add_log("sys", "System reset — all slots reloaded")
    return jsonify({"success": True, "stats": get_stats(), "slots": list(parking_slots.values())})


if __name__ == "__main__":
    add_log("sys", "Smart Parking System started — 40 slots loaded")
    print("\n" + "="*50)
    print("  Smart Parking System")
    print("  http://127.0.0.1:5000")
    print("="*50 + "\n")
    app.run(debug=True, port=5000)