import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the path to the alerts JSON file
import { type ServiceAlert } from '@/lib/types'; // Import the centralized type

const alertsFilePath = path.join(process.cwd(), 'src', 'app', 'data', 'alerts.json');

// ServiceAlert is suitable here as it defines the structure we're working with.
// Alias if needed for clarity, e.g. type InternalAlert = ServiceAlert;

async function readAlerts(): Promise<ServiceAlert[]> {
  try {
    const data = await fs.readFile(alertsFilePath, 'utf8');
    return JSON.parse(data) as ServiceAlert[];
  } catch (error) {
    // If file doesn't exist or is invalid JSON, return empty array
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(alertsFilePath, JSON.stringify([]), 'utf8'); // Create file if not exists
      return [];
    }
    console.error("Error reading alerts file:", error);
    throw new Error("Could not read alerts data.");
  }
}

async function writeAlerts(alerts: ServiceAlert[]): Promise<void> {
  try {
    await fs.writeFile(alertsFilePath, JSON.stringify(alerts, null, 2), 'utf8');
  } catch (error) {
    console.error("Error writing alerts file:", error);
    throw new Error("Could not save alerts data.");
  }
}

// GET alerts
// By default, returns active alerts.
// If ?all=true query param is present, returns all alerts (for admin).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';

    const alerts = await readAlerts();
    if (showAll) {
      return NextResponse.json(alerts); // Return all alerts for admin
    }
    const activeAlerts = alerts.filter(alert => alert.active);
    return NextResponse.json(activeAlerts); // Return only active for public
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Error fetching alerts" }, { status: 500 });
  }
}

// POST a new alert (for admin)
export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ message: "Invalid alert message" }, { status: 400 });
    }

    const alerts = await readAlerts();
    const newAlert: Alert = {
      id: Date.now().toString(), // Simple unique ID
      message: message.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    alerts.push(newAlert);
    await writeAlerts(alerts);

    return NextResponse.json(newAlert, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Error creating alert" }, { status: 500 });
  }
}

// DELETE an alert (for admin)
// We'll use a query parameter for the ID: /api/alerts?id=some_id
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: "Alert ID is required" }, { status: 400 });
    }

    let alerts = await readAlerts();
    const initialLength = alerts.length;
    alerts = alerts.filter(alert => alert.id !== id);

    if (alerts.length === initialLength) {
      return NextResponse.json({ message: "Alert not found" }, { status: 404 });
    }

    await writeAlerts(alerts);
    return NextResponse.json({ message: "Alert deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Error deleting alert" }, { status: 500 });
  }
}
