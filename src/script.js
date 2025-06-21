import mapboxgl from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1IjoiY3Jpc3BpbWFwcyIsImEiOiJjbWM0NGdnOTkwYzBpMmlxMmV1dmw0NDJxIn0.EhpaMMGtjZquLHX9rrCrmg";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-122.09855796974067, 37.63314476409785],
  zoom: 14,
});

map.on("style.load", main);

async function main() {
  const address =
    "26050 Peterman Avenue, Hayward, California 94545, United States";
  const origin = [-122.101416, 37.624408]; // Portsmouth Avenue

  const geocode = await getGeocode(address);
  const destination = geocode.features[0].geometry.coordinates;
  // alert(destination);

  // -- the device is facing south-east (≈ 135 ° from true north)
  const headingDeg = 135; // compass angle
  const toleranceDeg = 30; // ± 30 ° “cone” is typical

  // 1 entry per coordinate, separated by “;”.
  // give the origin a bearing filter, leave the destination blank ⇒ “;;”
  const bearings = `${headingDeg},${toleranceDeg};`; // "135,30;;"

  // want the *destination* snapped to the curb, origin left unspecified
  // an empty first slot keeps the list length = 2 waypoints  (“;curb”)
  // (you could also write "unrestricted;curb")
  const approaches = ";curb";

  const directions = await getDirections(
    origin,
    destination,
    bearings,
    approaches
  );

  if (directions && directions.routes && directions.routes.length) {
    addRouteToMap(directions.routes[0].geometry);
  } else {
    console.error("Directions API error:", directions);
    alert(directions.message || "No route found");
  }

  new mapboxgl.Marker({ color: "#FF0000" }).setLngLat(destination).addTo(map);

  new mapboxgl.Marker({ color: "#32CD32" }).setLngLat(origin).addTo(map);
}

/**
 * Accepts an address query string to fetch a geocode
 * @param {string} query Query String for search request
 * @returns {Promise<object>} response
 */
async function getGeocode(query) {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json`
  );

  url.searchParams.set("access_token", mapboxgl.accessToken);
  url.searchParams.set("limit", 1);
  url.searchParams.set("types", ["postcode", "address"].join());

  const response = await fetch(url);

  return response.json();
}

/**
 * Acccepts two coordinate pairs and fetches directions
 * to get from one to the other
 * @param {[number, number]} origin
 * @param {[number, number]} destination
 * @returns {Promise<object>} response
 
async function getDirections(origin, destination) {
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.join()};${destination.join()}.json`
  );

  url.searchParams.set("access_token", mapboxgl.accessToken);
  url.searchParams.set("steps", true);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("roundabout_exits", true);

  const response = await fetch(url);

  return response.json();
}
**/

/**
 * Fetch Mapbox driving directions between two points.
 *
 * @param {[number, number]} origin       – [lng, lat] of the start point
 * @param {[number, number]} destination  – [lng, lat] of the end point
 * @param {string} [bearings]             – semicolon-delimited bearings list
 * @param {string} [approaches]           – semicolon-delimited approaches list
 * @returns {Promise<object>}             – Directions API JSON response
 */
async function getDirections(
  origin,
  destination,
  bearings = "",
  approaches = ""
) {
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.join()};${destination.join()}.json`
  );

  url.searchParams.set("access_token", mapboxgl.accessToken);
  url.searchParams.set("steps", "true");
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("roundabout_exits", "true");

  if (bearings) url.searchParams.set("bearings", bearings);
  if (approaches) url.searchParams.set("approaches", approaches);

  const response = await fetch(url);
  return response.json();
}

/**
 * Function accepts a GeoJSON geometry, and
 * adds it to the map as routeline with casing
 * @param {Geometry} geometry
 
function addRouteToMap(geometry) {
  // You can leave this function as is

  const routeSourceId = "route-source";
  const routeLineLayer = "route-line-layer";
  const routeLineCasing = "route-casing-layer";

  map.addSource(routeSourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: geometry,
        },
      ],
    },
  });

  map.addLayer({
    id: routeLineCasing,
    type: "line",
    source: routeSourceId,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#2d5f99",
      "line-width": 8,
    },
  });

  map.addLayer({
    id: routeLineLayer,
    type: "line",
    source: routeSourceId,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#4882c5",
      "line-width": 5,
    },
  });
}
*/

/**
 * Adds or updates a route on the map.
 * @param {Geometry} geometry – GeoJSON LineString from the Directions API
 */
function addRouteToMap(geometry) {
  const routeSourceId = "route-source";
  const routeLineLayer = "route-line-layer";
  const routeCasing = "route-casing-layer";

  // Reusable feature collection
  const routeData = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry }],
  };

  // 1.  Source: create once, update on later calls
  if (map.getSource(routeSourceId)) {
    map.getSource(routeSourceId).setData(routeData);
  } else {
    map.addSource(routeSourceId, { type: "geojson", data: routeData });
  }

  // 2.  Layers: add only if they don’t exist yet
  if (!map.getLayer(routeCasing)) {
    map.addLayer({
      id: routeCasing,
      type: "line",
      source: routeSourceId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#2d5f99", "line-width": 8 },
    });
  }

  if (!map.getLayer(routeLineLayer)) {
    map.addLayer({
      id: routeLineLayer,
      type: "line",
      source: routeSourceId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#4882c5", "line-width": 5 },
    });
  }
}
