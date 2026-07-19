// ==========================================================================
// 1. DATABASE INITIALIZATION (Dexie.js)
// ==========================================================================
const db = new Dexie("VisitCompanionDB");

db.version(1).stores({
  visits: "++id, name, notes, date, lat, lng"
});

db.open()
  .then(() => {
    console.log("Database opened successfully!");
  })
  .catch((err) => {
    console.error("Failed to open database: ", err);
  });

// ==========================================================================
// 2. GLOBAL VARIABLES & ELEMENT SELECTION
// ==========================================================================
const visitForm = document.getElementById("visit-form");
const personNameInput = document.getElementById("person-name");
const visitNotesInput = document.getElementById("visit-notes");
const returnDateInput = document.getElementById("return-date");
const gpsBtn = document.getElementById("gps-btn");
const gpsDisplay = document.getElementById("gps-display");

// Tracks the coordinates captured by the hardware
let currentLat = null;
let currentLng = null;

// ==========================================================================
// 3. GPS HARDWARE CAPTURE
// ==========================================================================
gpsBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    gpsDisplay.textContent = "Location Error: GPS not supported.";
    return;
  }

  gpsDisplay.textContent = "🛰️ Connecting to satellites...";
  gpsBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLat = position.coords.latitude;
      currentLng = position.coords.longitude;

      gpsDisplay.textContent = `📍 Captured: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`;
      gpsDisplay.style.borderLeftColor = "#2563eb";
      gpsBtn.disabled = false;
    },
    (error) => {
      console.error("GPS Error:", error.message);
      gpsBtn.disabled = false;
      if (error.code === 1) {
        gpsDisplay.textContent =
          "❌ Permission denied. Please allow location access.";
      } else {
        gpsDisplay.textContent = "❌ GPS Error: Unable to read location.";
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
});

// ==========================================================================
// 4. FORM SUBMISSION (Save to Database)
// ==========================================================================
visitForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nameValue = personNameInput.value;
  const notesValue = visitNotesInput.value;
  const dateValue = returnDateInput.value;

  try {
    // Add record to database using current GPS variables
    await db.visits.add({
      name: nameValue,
      notes: notesValue,
      date: dateValue || "No return date set",
      lat: currentLat,
      lng: currentLng
    });

    // Reset the form fields on screen
    visitForm.reset();

    // Reset the GPS display text and variables back to default
    currentLat = null;
    currentLng = null;
    gpsDisplay.textContent = "Location: Not captured yet";
    gpsDisplay.style.borderLeftColor = "#0d9488";

    // Refresh the visual log feed instantly on screen
    await renderVisitsLog();

    // Pop up the confirmation message
    alert("Visit saved securely to local storage!");
  } catch (error) {
    console.error("Error saving to database:", error);
    alert("Oops, something went wrong saving your data.");
  }
});

// ==========================================================================
// STEP 4: DISPLAYING REAL DATA & GOOGLE MAPS NAVIGATION Links
// ==========================================================================

// 1. Grab the container where the log cards should be displayed
const visitsLogContainer = document.getElementById("visits-log");

// 2. Create a function to fetch logs from the database and paint them on the screen
async function renderVisitsLog() {
  // Fetch all records out of our IndexedDB table, sorted backwards (newest entries first)
  const allVisits = await db.visits.reverse().toArray();

  // Clear out the static placeholder HTML so we have a clean slate
  visitsLogContainer.innerHTML = "";

  // If there are no entries saved yet, show a friendly placeholder message
  if (allVisits.length === 0) {
    visitsLogContainer.innerHTML =
      '<p style="text-align:center; color:#6b7280; padding:20px;">No return visits recorded yet. Add your first one above!</p>';
    return;
  }

  // 3. Loop through every record in our database and generate a card for it
  allVisits.forEach((visit) => {
    // Build a native Google Maps link using the latitude and longitude we saved
    // If GPS wasn't clicked, we point to a general search layout
    // geo:lat,lng opens the native maps app directly on Android
    // REPLACE your mapsUrl line inside renderVisitsLog() with this:
    let mapsUrl = `google.navigation:q=${visit.lat},${visit.lng}`;
    // Format the card layout dynamically using the record values
    const cardHTML = `
            <div class="visit-card">
                <div class="card-header">
                    <h3>${visit.name}</h3>
                    <span class="card-date">${visit.date}</span>
                </div>
                <p class="card-notes">${visit.notes}</p>
                <div class="card-footer">
                    <span class="card-coordinates">
                        ${visit.lat ? `📍 Coordinates Saved` : `❌ No Location Pin`}
                    </span>
                    ${visit.lat ? `<a href="${mapsUrl}" target="_blank" class="btn-nav">Navigate Back (Google Maps)</a>` : ""}
                </div>
            </div>
        `;

    // Append this new card straight into our visual page container
    visitsLogContainer.insertAdjacentHTML("beforeend", cardHTML);
  });
}

// 4. Run the rendering function immediately when the script first loads up
renderVisitsLog();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(() => console.log("Service Worker Active!"))
    .catch((err) => console.error("Service Worker Failed:", err));
}
