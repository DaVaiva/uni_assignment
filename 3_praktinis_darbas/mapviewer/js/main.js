var map = new maplibregl.Map({
    container: 'map', // container id
    style: 'vector_tiles/topo.openmap.style.json', // style URL
    center: [25.281, 54.676], // starting position
    zoom: 13, // starting zoom
    minZoom: 7,
    maxZoom: 17,
    hash:true
});

// Navigacijos kontrolė
map.addControl(new maplibregl.NavigationControl(), 'top-left');

// Pilno ekrano rodymas
map.addControl(new maplibregl.FullscreenControl({container: document.querySelector('outer-container')}), "top-left");


function changeMapStyle(styleType) {
    // removeLayer();
    map.setStyle("vector_tiles/" + styleType + ".openmap.style.json");
    

    /*
      Šioje vietoje turėtų būti naudojamas MapLibre GL įvykis style.load
      Kol kas realizuojama su timeout, nes įvykis nesuveikia, aprašytas bug'as repozitorijoje
    */
    setTimeout(() => {
      loadLayers();
    }, "1000");
}

map.on("load", () => {
    loadLayers();
});

function toggleLayer(layerName) {
  const layerNameHtml = "layer-btn-" + layerName;

  if (map.getLayoutProperty(layerName, "visibility") == "none") {
    map.setLayoutProperty(layerName, "visibility", "visible");
    document.getElementById(layerNameHtml).style.filter = "none";
  } else {
    map.setLayoutProperty(layerName, "visibility", "none");
    document.getElementById(layerNameHtml).style.filter = "grayscale()";
  }
}

let sidebarStatus = true;
function toggleSidebar() {
  if (sidebarStatus == "none") {
    document.getElementById("mapapp-sidebar").style.display = "block";
    sidebarStatus = "visible";
  } else {
    document.getElementById("mapapp-sidebar").style.display = "none";
    sidebarStatus = "none";
  }
}

function loadLayers() {
  console.log("Loading layers");
  map.addSource("vda-source", {
    type: "raster",
    tiles: [
      "http://127.0.0.1:8010/ogc/demo_service?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=gyv_stat_2021",
    ],
    tileSize: 256,
  });
  map.addLayer({
    id: "demo-layer",
    type: "raster",
    source: "vda-source",
    layout: {
      visibility: "none",
    },
    paint: {},
  });

  map.addSource("vp1-source", {
    type: "raster",
    tiles: [
      "http://127.0.0.1:8010/ogc/route_service?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=vln_marsrutai",
    ],
    tileSize: 256,
  });
  map.addLayer({
    id: "vp-marsrutai",
    type: "raster",
    source: "vp1-source",
    layout: {
      visibility: "none",
    },
    paint: {},
  });

  map.addSource("vp2-source", {
    type: "raster",
    tiles: [
      "http://127.0.0.1:8010/ogc/tree_service?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=pavojingi_medziai",
    ],
    tileSize: 256,
  });
  map.addLayer({
    id: "vp-medziai",
    type: "raster",
    source: "vp2-source",
    layout: {
      visibility: "none",
    },
  });

  map.addSource("am-source", {
    type: "raster",
    tiles: [
      "http://127.0.0.1:8010/ogc/invasive_service?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=inv_radavietes",
    ],
    tileSize: 256,
  });
  map.addLayer({
    id: "am-invaziniai",
    type: "raster",
    source: "am-source",
    layout: {
      visibility: "none",
    },
  });
}

function removeLayer() {
  /*
  
    Apsvarstykite, kas būtų, jeigu mūsų žemėlapyje būtų 30 sluoksnių. 
    Pagalvokite apie šios vietos išskaidymą į funkciją(-as).
    
    Kaip tą spręstumėte? 

  */

  console.log("Removing layers");
  map.removeLayer("stvk-parkai");
  map.removeLayer("uetk-hidroelektrines");
  map.removeLayer("demo-layer");
  document.getElementById("layer-btn-stvk-parkai").style.filter = "grayscale()";
  document.getElementById("layer-btn-demo-layer").style.filter = "grayscale()";

  map.removeSource("stvk-source");
  map.removeSource("uetk-source");
  map.removeSource("demo-source");
}

const geocoderApi = {
  forwardGeocode: async (config) => {
      const features = [];
      try {
          const request =
      `https://nominatim.openstreetmap.org/search?q=${
          config.query
      }&format=geojson&polygon_geojson=1&addressdetails=1`;
          const response = await fetch(request);
          const geojson = await response.json();
          for (const feature of geojson.features) {
              const center = [
                  feature.bbox[0] +
              (feature.bbox[2] - feature.bbox[0]) / 2,
                  feature.bbox[1] +
              (feature.bbox[3] - feature.bbox[1]) / 2
              ];
              const point = {
                  type: 'Feature',
                  geometry: {
                      type: 'Point',
                      coordinates: center
                  },
                  place_name: feature.properties.display_name,
                  properties: feature.properties,
                  text: feature.properties.display_name,
                  place_type: ['place'],
                  center
              };
              features.push(point);
          }
      } catch (e) {
          console.error(`Failed to forwardGeocode with error: ${e}`);
      }

      return {
          features
      };
  }
};
map.addControl(
  new MaplibreGeocoder(geocoderApi, {
      maplibregl
  })
);

// distance measurement

const distanceContainer = document.getElementById('distance');

    // GeoJSON object to hold our measurement features
    const geojson = {
        'type': 'FeatureCollection',
        'features': []
    };

    // Used to draw a line between points
    const linestring = {
        'type': 'Feature',
        'geometry': {
            'type': 'LineString',
            'coordinates': []
        }
    };

    map.on('load', () => {
        map.addSource('geojson', {
            'type': 'geojson',
            'data': geojson
        });

        // Add styles to the map
        map.addLayer({
            id: 'measure-points',
            type: 'circle',
            source: 'geojson',
            paint: {
                'circle-radius': 5,
                'circle-color': '#000'
            },
            filter: ['in', '$type', 'Point']
        });
        map.addLayer({
            id: 'measure-lines',
            type: 'line',
            source: 'geojson',
            layout: {
                'line-cap': 'round',
                'line-join': 'round'
            },
            paint: {
                'line-color': '#000',
                'line-width': 2.5
            },
            filter: ['in', '$type', 'LineString']
        });

        map.on('click', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['measure-points']
            });

            // Remove the linestring from the group
            // So we can redraw it based on the points collection
            if (geojson.features.length > 1) geojson.features.pop();

            // Clear the Distance container to populate it with a new value
            distanceContainer.innerHTML = '';

            // If a feature was clicked, remove it from the map
            if (features.length) {
                const id = features[0].properties.id;
                geojson.features = geojson.features.filter((point) => {
                    return point.properties.id !== id;
                });
            } else {
                const point = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [e.lngLat.lng, e.lngLat.lat]
                    },
                    'properties': {
                        'id': String(new Date().getTime())
                    }
                };

                geojson.features.push(point);
            }

            if (geojson.features.length > 1) {
                linestring.geometry.coordinates = geojson.features.map(
                    (point) => {
                        return point.geometry.coordinates;
                    }
                );

                geojson.features.push(linestring);

                // Populate the distanceContainer with total distance
                const value = document.createElement('pre');
                value.textContent =
                    `Total distance: ${
                        turf.length(linestring).toLocaleString()
                    }km`;
                distanceContainer.appendChild(value);
            }

            map.getSource('geojson').setData(geojson);
        });
    });

// show curser coordinates
map.on('mousemove', (e) => {
  document.getElementById('info').innerHTML =
      // e.point is the x, y coordinates of the mousemove event relative
      // to the top-left corner of the map
      `${JSON.stringify(e.point)
      }<br />${
          // e.lngLat is the longitude, latitude geographical position of the event
          JSON.stringify(e.lngLat.wrap())}`;
});




document.getElementById('fit').addEventListener('click', () => {
  map.fitBounds([
      [25.193298, 54.755824],
      [25.439714, 54.628396]
  ]);
});