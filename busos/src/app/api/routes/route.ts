import { NextResponse } from 'next/server';
import rutes from '@/app/data/rutes.json'; // Adjust path as necessary

export async function GET() {
  try {
    // In a real-world scenario, you might add more complex logic here,
    // like fetching from a database, error handling, etc.
    return NextResponse.json(rutes);
  } catch (error) {
    console.error("Failed to fetch routes:", error);
    return NextResponse.json({ message: "Error fetching routes" }, { status: 500 });
  }
}

// IMPORTANT: Writing to the file system is not recommended for serverless environments.
// This is for demonstration with local development.
// For production, use a database or proper external storage.
import fs from 'fs/promises';
import path from 'path';

// Define the path to the JSON file
const dataFilePath = path.join(process.cwd(), 'src', 'app', 'data', 'rutes.json');

export async function PUT(request: Request) {
  try {
    const updatedRutes = await request.json();
    // Basic validation (can be expanded)
    if (!Array.isArray(updatedRutes)) {
      return NextResponse.json({ message: "Invalid data format" }, { status: 400 });
    }

    await fs.writeFile(dataFilePath, JSON.stringify(updatedRutes, null, 2), 'utf8');
    return NextResponse.json({ message: "Routes updated successfully" });
  } catch (error) {
    console.error("Failed to update routes:", error);
    return NextResponse.json({ message: "Error updating routes" }, { status: 500 });
  }
}
