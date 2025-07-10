import { NextResponse } from 'next/server';
import horaris from '@/app/data/horaris.json'; // Adjust path as necessary

export async function GET() {
  try {
    // In a real-world scenario, you might add more complex logic here,
    // like fetching from a database, error handling, etc.
    return NextResponse.json(horaris);
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json({ message: "Error fetching schedules" }, { status: 500 });
  }
}

// IMPORTANT: Writing to the file system is not recommended for serverless environments.
// This is for demonstration with local development.
// For production, use a database or proper external storage.
import fs from 'fs/promises';
import path from 'path';

// Define the path to the JSON file
// Correctly navigate up from 'app/api/schedules' to 'app/data'
const dataFilePath = path.join(process.cwd(), 'src', 'app', 'data', 'horaris.json');


export async function PUT(request: Request) {
  try {
    const updatedHoraris = await request.json();
    // Basic validation (can be expanded)
    if (!Array.isArray(updatedHoraris)) {
      return NextResponse.json({ message: "Invalid data format" }, { status: 400 });
    }

    await fs.writeFile(dataFilePath, JSON.stringify(updatedHoraris, null, 2), 'utf8');
    return NextResponse.json({ message: "Schedules updated successfully" });
  } catch (error) {
    console.error("Failed to update schedules:", error);
    return NextResponse.json({ message: "Error updating schedules" }, { status: 500 });
  }
}
