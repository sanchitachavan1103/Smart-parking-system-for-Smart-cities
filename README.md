# Smart Parking System 🚗

A real-time IoT Smart Parking System built with **Python Flask**.

## Features

- **Live slot monitoring** — 40 parking slots, each toggleable via sensor simulation
- **Animated entry/exit gates** — barrier arm opens/closes on vehicle detection
- **Entry display board** — monochrome board showing live free/occupied counts
- **Vehicle counter** — tracks total entries and exits for the day
- **IoT simulation** — randomises sensor data to mimic real IoT events
- **Activity log** — timestamped log of every entry, exit, and system event
- **Live pie chart** — visual breakdown of occupancy
- **REST API** — all state managed via Flask endpoints

## Project Structure

```
smart_parking/
├── app.py                  # Flask backend + REST API
├── requirements.txt
├── templates/
│   └── index.html          # Dashboard UI
└── static/
    ├── css/style.css
    └── js/app.js
```

## Setup & Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the app
python app.py

# 3. Open in browser
http://127.0.0.1:5000
```

## API Endpoints

| Method | Endpoint                     | Description                  |
|--------|------------------------------|------------------------------|
| GET    | `/api/status`                | Get full system state        |
| POST   | `/api/entry`                 | Trigger vehicle entry        |
| POST   | `/api/exit`                  | Trigger vehicle exit         |
| POST   | `/api/toggle_slot/<id>`      | Toggle a specific slot       |
| POST   | `/api/simulate_random`       | Simulate IoT sensor events   |
| POST   | `/api/reset`                 | Reset entire system          |

## Architecture

```
IoT Sensors → Flask REST API → HTML/JS Dashboard
                ↓
          Parking State
     (slots, gates, counters)
```
