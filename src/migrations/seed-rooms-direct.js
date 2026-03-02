// seed-rooms-direct.js
const mongoose = require("mongoose");
require("dotenv").config();

// Import your Room model
const Room = require("./../modules/ROOMS/Room.model"); // Adjust path as needed

// Your rooms data (paste the full array here)
const rooms = [
  /* ... your rooms array ... */
];

async function seedRoomsDirect() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log(`📊 Processing ${rooms.length} rooms...`);

    let success = 0;
    let failed = 0;

    for (const room of rooms) {
      try {
        // Check if room exists
        const existing = await Room.findOne({ slug: room.slug });

        if (existing) {
          console.log(`⚠️ Skipping ${room.name} - already exists`);
          continue;
        }

        await Room.create(room);
        console.log(`✅ Created: ${room.name}`);
        success++;
      } catch (error) {
        console.log(`❌ Failed: ${room.name} - ${error.message}`);
        failed++;
      }
    }

    console.log("\n🎉 Seeding complete!");
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed: ${failed}`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

seedRoomsDirect();
