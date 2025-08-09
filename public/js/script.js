(function () {
  "use strict";
  const forms = document.querySelectorAll(".needs-validation");
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add("was-validated");
      },
      false
    );
  });
})();

// // Read JSON from hidden script tag
// const listingData = JSON.parse(
//   document.getElementById("listing-data").textContent
// );

// // Extract values
// const coordinates = listingData.coordinates;
// const lat = coordinates[1];
// const lng = coordinates[0];

// // Initialize map
// const map = L.map("map").setView([lat, lng], 13);

// // Add OpenStreetMap tiles
// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   attribution: "&copy; OpenStreetMap contributors"
// }).addTo(map);

// // Add marker
// L.marker([lat, lng])
//   .addTo(map)
//   .bindPopup(`<b>${listingData.title}</b><br>${listingData.location}`)
//   .openPopup();


