// Renders an Azimuthal Equidistant projection of Earth centered on the
// North Pole, with Greenwich at the top, clipped at 60°S.
// The SVG uses a fixed 1000x1000 viewBox so it scales fluidly with its container.

(function () {
  const SIZE = 1000;
  const CENTER = SIZE / 2;
  const CLIP_ANGLE_DEG = 145; // 145° from the North Pole = 55°S southern limit
                              // (60°S is mostly bare Southern Ocean — wasted resolution)

  // The disc is inset inside the clock so the sun (orbiting at 91% radius
  // per app.js sunScale) has a visible channel around it, matching the
  // earlier Earth-image layout.
  const DISC_RADIUS_FRACTION = 0.80;
  const DISC_RADIUS = CENTER * DISC_RADIUS_FRACTION;

  // In an azimuthal equidistant projection, distance from the projection
  // center equals scale × angular_distance_in_radians. Solving for scale
  // so the clip circle reaches DISC_RADIUS:
  const SCALE = DISC_RADIUS / (CLIP_ANGLE_DEG * Math.PI / 180);

  function render(data) {
    const svg = document.getElementById('earth-svg');
    if (!svg) return;

    // [0, -90, 180]: bring the North Pole to the projection center, then
    // roll 180° so Greenwich sits at the top of the disc instead of the bottom.
    const projection = d3.geoAzimuthalEquidistant()
      .rotate([0, -90, 180])
      .clipAngle(CLIP_ANGLE_DEG)
      .translate([CENTER, CENTER])
      .scale(SCALE);

    const path = d3.geoPath(projection);

    const sphere = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sphere.setAttribute('class', 'globe-ocean');
    sphere.setAttribute('d', path({ type: 'Sphere' }));
    svg.appendChild(sphere);

    const countries = topojson.feature(data, data.objects.countries);
    const land = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    land.setAttribute('class', 'globe-land');
    land.setAttribute('d', path(countries));
    svg.appendChild(land);

    const borders = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    borders.setAttribute('class', 'globe-borders');
    borders.setAttribute('d', path(topojson.mesh(data, data.objects.countries, (a, b) => a !== b)));
    svg.appendChild(borders);
  }

  document.addEventListener('DOMContentLoaded', () => {
    fetch('data/countries-110m.json')
      .then(r => r.json())
      .then(render)
      .catch(err => console.error('Failed to load world map data:', err));
  });
})();
