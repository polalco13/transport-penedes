# Bus Schedule App - Busos del Penedès

## Overview

This project is a React-based web application that provides bus schedules for the Penedès region. It allows users to check bus timings between different origins and destinations, view upcoming buses, and see full daily schedules.

## Features

- Select origin and destination from available options
- Swap origin and destination with a single click
- View the next 3 upcoming buses
- Choose a specific day of the week to check schedules
- Display full daily schedules
- Detect user's location to suggest the nearest origin
- Responsive design for various screen sizes

## Technologies Used

- React
- Next.js
- TypeScript
- Framer Motion for animations
- Lucide React for icons
- Tailwind CSS for styling
- shadcn/ui components

## Setup and Installation

1. Clone the repository:
   ```
   git clone [repository-url]
   ```

2. Navigate to the project directory:
   ```
   cd bus-schedule-app
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

## Data Structure

The app uses two main data files:

- `horaris.json`: Contains the schedules for each route
- `rutes.json`: Contains information about available routes, including origins and destinations

## Components

- `BusScheduleApp`: The main component that renders the entire application
- UI components from shadcn/ui library (Button, Select, etc.)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
