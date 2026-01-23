export const mockData = Array.from({ length: 50 }, (_, i) => {
    // Base coordinates for Shomolu/Bariga roughly
    const baseLat = 6.54;
    const baseLng = 3.39;

    // Random jitter for distribution
    const lat = baseLat + (Math.random() - 0.5) * 0.02;
    const lng = baseLng + (Math.random() - 0.5) * 0.02;

    const fearDocs = Math.floor(Math.random() * 5) + 1;
    const avoid = Math.floor(Math.random() * 5) + 1;
    const safety = Math.floor(Math.random() * 5) + 1;

    // New Fields Logic
    const safetyDay = Math.floor(Math.random() * 5) + 1;
    // Night safety is usually lower than day safety, especially if no lights
    const streetlights = Math.random() > 0.5 ? "Yes" : "No";
    let safetyNight = safetyDay - (Math.floor(Math.random() * 2));
    if (streetlights === "No") safetyNight -= 1;
    if (safetyNight < 1) safetyNight = 1;

    const socialCohesion = parseFloat((Math.random() * 4 + 1).toFixed(1)); // 1.0 to 5.0
    const vigilante = Math.random() > 0.7; // 30% have vigilante nearby

    const streetType = Math.random() > 0.4 ? "Major Road" : (Math.random() > 0.5 ? "Alleyway" : "Footpath");
    const hasDisorder = Math.random() > 0.6;

    const disorders = [];
    if (hasDisorder) {
        if (Math.random() > 0.5) disorders.push("Litter");
        if (Math.random() > 0.5) disorders.push("Graffiti");
        if (Math.random() > 0.7) disorders.push("Abandoned/uncompleted buildings");
    } else {
        disorders.push("None");
    }

    // Lagos/Shomolu specific street names for realism
    const streetNames = ["Bajulaiye Road", "Fola Agoro", "Finbarr's Road", "Pedro Road", "Bariga Road", "Akoka Road", "Ilaje Road", "Ago-Iwoye Street", "Ayetoro Street", "Olatunji Street", "Popoola Street", "Danmole Street", "Shipeolu Street", "Market Street", "Community Road"];
    const randomStreet = streetNames[Math.floor(Math.random() * streetNames.length)];

    return {
        id: i + 1,
        street_name: randomStreet,
        coordinates: [lat, lng],
        demographics: {
            age: 20 + Math.floor(Math.random() * 40),
            gender: Math.random() > 0.5 ? "Male" : "Female"
        },
        fear_indicators: {
            fear_robbery_street: fearDocs,
            avoid_night: avoid,
            safety_street_night: safety, // Keeping original field for compatibility if needed
            // New Temporal Fields
            safety_day: safetyDay,
            safety_night: safetyNight
        },
        social: {
            social_cohesion: socialCohesion,
            vigilante_proximity: vigilante
        },
        victimization: {
            stolen_from: Math.random() > 0.7 ? "Yes" : "No"
        },
        observed_environment: {
            has_streetlight: streetlights,
            street_type: streetType,
            visible_disorder: disorders,
            proximity_to_market: Math.random() > 0.5 ? "Yes" : "No"
        }
    };
});
