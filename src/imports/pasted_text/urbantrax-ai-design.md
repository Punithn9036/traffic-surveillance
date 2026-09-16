Design Part 1 of a production-quality smart-city AI traffic surveillance web application called:

URBANTRAX AI

Subtitle:
City-Wide Multi-Camera ANPR & Traffic Intelligence

This is a Smart India Hackathon 2026 project for problem statement:
SIH26127 — City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics.

IMPORTANT:
You are designing ONLY Part 1 of the complete frontend.

Part 1 contains:
1. Main Dashboard
2. Live Cameras
3. Detailed Camera View

Do not design Vehicle Intelligence, ANPR, Trajectories, Analytics, Alerts, Watchlist, Camera Management, Reports, System Health or Settings pages.

The other pages will be designed separately by other teammates.

==================================================
GLOBAL DESIGN SYSTEM — MUST FOLLOW EXACTLY
==================================================

The entire UrbanTrax application must look like one unified professional product.

Visual style:
- premium smart-city operations center
- modern AI/computer-vision platform
- dark-first interface
- technical but clean
- professional, not gaming-oriented
- no excessive neon
- no unnecessary glassmorphism
- no excessive gradients
- high information density
- strong visual hierarchy

Colors:
- background: very dark navy/charcoal
- cards: slightly lighter dark surface
- primary accent: electric blue
- secondary accent: cyan
- success: green
- warning: amber
- danger: red
- primary text: white
- secondary text: light gray
- muted text: gray

Use consistent:
- border radius
- spacing
- shadows
- typography
- buttons
- badges
- table style
- card style
- icon style

Do NOT invent a different design language.

==================================================
GLOBAL APPLICATION SHELL
==================================================

Create a persistent desktop sidebar.

Sidebar items, in EXACT order:

UrbanTrax AI logo

Dashboard
Live Cameras
Vehicle Intelligence
ANPR
Trajectories
Traffic Analytics
Alerts
Watchlist
Camera Management
Reports
System Health
Settings

Show Dashboard as the active item on the Dashboard page.

Bottom:
- system status
- user profile
- settings icon

Top navbar:
- page title
- global search
- system status
- notification bell
- date/time
- user avatar/profile

The sidebar must collapse responsively.

Design for:
- 1440px desktop
- laptop
- tablet
- mobile

==================================================
PAGE 1 — MAIN DASHBOARD
==================================================

Page title:
Traffic Intelligence Dashboard

Subtitle:
Real-time city-wide traffic monitoring and vehicle intelligence.

Create a professional command-center layout.

--------------------------------------------------
KPI SECTION
--------------------------------------------------

Create 6 KPI cards:

1. Active Cameras
Example:
24 / 28 Online

2. Vehicles Detected
Example:
12,482

3. Vehicles Currently Tracked
Example:
387

4. ANPR Reads
Example:
3,842

5. Active Alerts
Example:
12

6. Current Congestion
Example:
Moderate

Each card should include:
- icon
- title
- primary number
- supporting information
- trend where useful
- status indicator

The cards must clearly support dynamic backend values later.

--------------------------------------------------
LIVE TRAFFIC MAP
--------------------------------------------------

Large map section.

Title:
City Traffic Overview

Show:
- road network
- camera markers
- selected camera
- traffic/congestion indicators
- active camera status
- vehicle movement visualization

Camera markers must support:
- online
- offline
- warning
- selected

Clicking a camera marker should open camera information.

Do not use fake geographic claims.
Use clearly labeled demo/sample city data.

--------------------------------------------------
REAL-TIME ALERT PANEL
--------------------------------------------------

Right-side panel:

Title:
Live Alerts

Show example alert cards:

BLACKLISTED VEHICLE
KA01AB1234
CAM-003
2 min ago

HEAVY CONGESTION
MG Road Junction
5 min ago

CAMERA OFFLINE
CAM-009
8 min ago

Each alert should contain:
- severity indicator
- alert type
- vehicle/camera
- timestamp
- small action button

--------------------------------------------------
TRAFFIC CHARTS
--------------------------------------------------

Create:

1. Traffic Volume Over Time
Line/area chart.

2. Vehicle Distribution
Donut chart:
- Cars
- Motorcycles
- Buses
- Trucks
- Other

3. Camera Traffic Volume
Bar chart.

4. Congestion Distribution
Chart or compact visualization.

Filters:
- Last 15 minutes
- Last hour
- Today
- Custom

--------------------------------------------------
LIVE SYSTEM STATUS
--------------------------------------------------

Small section showing:

AI Processing:
Healthy

API:
Healthy

Database:
Healthy

WebSocket:
Connected

Use green/amber/red status indicators.

==================================================
PAGE 2 — LIVE CAMERAS
==================================================

Page title:
Live Camera Monitoring

Subtitle:
Real-time multi-camera traffic surveillance.

Top controls:

- Search camera
- Location filter
- Online/offline filter
- Traffic level filter
- Grid/List toggle
- Refresh
- Auto-refresh
- Fullscreen

--------------------------------------------------
CAMERA GRID
--------------------------------------------------

Create a professional multi-camera grid.

Example:

CAM-001
MG Road Junction

CAM-002
Yeshwanthpur Junction

CAM-003
Hebbal Flyover

CAM-004
Airport Road

Each card contains:

- video viewport
- LIVE badge
- camera ID
- location
- current timestamp
- FPS
- traffic level
- vehicle count

Overlay computer-vision annotations:

Bounding boxes around vehicles.

Example:

Vehicle #024
Car
94%

Another example:

Vehicle #031
Bike
87%

If a plate is detected:

KA01AB1234
91%

Use realistic demonstration data.

--------------------------------------------------
CAMERA STATES
--------------------------------------------------

Design states for:

LIVE
OFFLINE
WARNING
CONNECTING
NO SIGNAL

These states must look consistent.

--------------------------------------------------
CAMERA INTERACTION
--------------------------------------------------

Clicking a camera opens the detailed camera view.

Provide:
- View Details
- Fullscreen
- Open Camera
- Toggle Overlays

==================================================
PAGE 3 — DETAILED CAMERA VIEW
==================================================

Large video area.

Overlay:
- bounding boxes
- tracking IDs
- detected plate
- confidence
- timestamp

Right panel:

Camera Details

Camera ID
CAM-003

Location
Hebbal Flyover

Status
LIVE

FPS
24

Vehicles Today
1,284

Current Vehicles
37

Traffic Level
High

Below video:

Detected Vehicles table:

Vehicle ID
Type
Plate
Confidence
Track Status
Timestamp

Example:

UTX-VH-00124
SUV
KA01AB1234
94%
Tracked
10:32:12

Also create:

Recent ANPR Reads

Plate
Time
Confidence

And:

Camera Event Timeline

10:32:12 Vehicle detected
10:32:15 Plate detected
10:32:18 Vehicle tracked
10:33:02 Vehicle exited

==================================================
UI STATES
==================================================

Create visual states for:
- loading
- empty
- error
- offline
- no camera
- no detections

Examples:
"Waiting for camera feed..."
"No vehicles detected"
"Unable to connect to camera"
"Retry"

==================================================
BACKEND READINESS
==================================================

This UI will later connect to a Python FastAPI backend and WebSocket.

Do not hardcode the architecture.

Design UI elements so they can consume data objects such as:

Camera:
id
name
location
latitude
longitude
status
fps

Vehicle:
id
vehicle_type
plate_number
confidence
camera_id
timestamp

Detection:
vehicle_id
camera_id
bbox
confidence
plate_number
plate_confidence
timestamp

Dashboard analytics:
vehicle_count
active_cameras
anpr_count
alerts
congestion

The UI should clearly separate dynamic data areas from static labels.

==================================================
FINAL REQUIREMENT
==================================================

Generate all screens for Part 1 with consistent reusable components.

This design will later be implemented in React + Vite + Tailwind CSS.

DO NOT change the global UrbanTrax design language.

The output must look like one part of a professional city traffic command center.