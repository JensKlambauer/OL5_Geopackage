import 'ol/ol.css';
import './styles.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import XYZ from 'ol/source/XYZ.js';
// import OSM from 'ol/source/OSM.js';
import GeoPackageAPI from '@ngageoint/geopackage'; // , { GeoPackageTileRetriever }
// import TileGrid from 'ol/tilegrid/TileGrid.js';
import { createXYZ } from 'ol/tilegrid.js';
// import {getWidth} from 'ol/extent.js';
// import {get as getProjection} from 'ol/proj.js';
import { addProjection, addCoordinateTransforms, transform, get, METERS_PER_UNIT, transformExtent } from 'ol/proj.js';
import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4';
import TileWMS from 'ol/source/TileWMS';
import { defaults as defaultControls } from 'ol/control.js';
import MousePosition from 'ol/control/MousePosition.js';
import { createStringXY } from 'ol/coordinate.js';
const fileType = require('file-type');
// var BoundingBox = require('../node_modules/@ngageoint/geopackage/lib/boundingBox');

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(),
  projection: 'EPSG:25833',
  undefinedHTML: 'außerhalb',
});

proj4.defs('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
register(proj4);

var urlGeosnDop = 'https://geodienste.sachsen.de/wms_geosn_dop-rgb/guest';
var sachsenDop = new TileLayer({
  title: 'DOP Sachsen',
  source: new TileWMS({
    projection: "EPSG:25833",
    url: urlGeosnDop,
    params: {
      'LAYERS': 'sn_dop_020'
    }
  })
});

// Abhängigkeit von extent, center?
// const center = transform([12.54257, 50.82634], "EPSG:4326", "EPSG:25833");
var map = new Map({
  controls: defaultControls({ attributionOptions: { collapsible: true } }).extend([mousePositionControl]),
  layers: [],
  target: 'map',
  view: new View({
    // center: center,
    // extent: [324701.0, 5632072.0, 328739.0, 5634781.0], //transformExtent([12.365956, 50.585565, 12.908844, 50.9645759], 'EPSG:4326','EPSG:25833'),               
    projection: "EPSG:25833",
    minZoom: 8,
    maxZoom: 21
  })
});

loadGeopackage('http://localhost:8066/wmsWAD25833.gpkg');
// loadGeopackage('http://localhost:8085/DopSachsen25833/DopSn5000.gpkg') //dop25833_1.gpkg
// loadGeopackage('http://ngageoint.github.io/GeoPackage/examples/rivers.gpkg'); // EPSG:3857

// default values
var defaultZoomLevel = 0;
var tableName = ""; // deps. from tablename!
// Abhängigkeit von Projektion 'EPSG:25833' 

// function to load the geopackage using xhr
function loadGeopackage(filepath) {
  // var xhr = new XMLHttpRequest();
  // xhr.open("GET", filepath, true);
  // xhr.responseType = "arraybuffer";
  // xhr.onload = function (oEvent) {
  //   var arrayBuffer = xhr.response;
  //   if (arrayBuffer) {
  //     var byteArray = new Uint8Array(arrayBuffer);
  //     loadByteArray(byteArray);
  //   }
  // };
  // xhr.send();

  fetch(filepath, { method: "GET" })  // , cache: "no-cache", mode: "no-cors",  headers: {"Content-Type": "arraybuffer"}
    .then(function (response) {
      return response.arrayBuffer();
    }).then(function (resp) {
      // console.log(resp)
      if (resp) {
        var byteArray = new Uint8Array(resp);
        loadByteArray(byteArray);
      }
    });
}

// handle geopackage (changed from documentation - https://github.com/ngageoint/geopackage-js)
function loadByteArray(array) {
  console.log("try loadByteArray")
  GeoPackageAPI.open(array, function (err, gp) {
    if (err)
      console.log("Fehler:", err)
  }).then((gp) => {
    if (gp) {
      console.log("GeoPackageAPI open");
      const tileTables = gp.getTileTables();
      if (tileTables) {
        // Tabellenname von der ersten Tiletabelle
        tableName = tileTables[0]
        console.log("tableName", tableName)
      }
      else
        throw new Error("no tiletable found")

      if (gp.isTable(tableName))
        getTilesFromTable(gp, tableName, defaultZoomLevel);
      else
        throw new Error("error table with tablename " + tableName + " is not a valid table")
    }
  })
    .catch((err) => console.log("Fehler:", err))
}

// function to get tiles from table
function getTilesFromTable(gpkg, tableName, zoom) {
  // console.log("gpkg", gpkg)
  var tileDao = gpkg.getTileDao(tableName);
  // console.log("tileDao", tileDao)

  var tms = tileDao.tileMatrixSet;
  // console.log("tms", tms)

  // TileMatrix Zoomstufe 0
  var tm = tileDao.getTileMatrixWithZoomLevel(zoom);
  // console.log("tm", tm)

  // create Openlayers tile grid
  var tileGrid = createXYZ({
    extent: [tms.min_x, tms.min_y, tms.max_x, tms.max_y], // extent of geopackage content
    maxZoom: tileDao.maxZoom,
    minZoom: tileDao.minZoom,
    // resolutions: resolutions,
    tileSize: [tm.tile_width, tm.tile_height] // tile size in pixels
  });
  console.log("tileGrid", tileGrid)

  // create tile retriever on projection 4326, 3857
  // var gpr = new GeoPackageTileRetriever(tileDao, tm.tile_width, tm.tile_height);
  // console.log("gpr", gpr)

  // setup tile layer -> EPSG:25833
  var tileLayer = new TileLayer({
    source: new XYZ({
      // opaque: false,
      projection: 'EPSG:25833',
      tileUrlFunction: function (tileCoord) {
        // create a simplified url for use in the tileLoadFunction
        // console.log("tileCoord", tileCoord)
        return tileCoord.toString();
      },
      tileLoadFunction: function (tile, url) {
        // console.log("tile", tile) 
        let tileCoord = url.split(',');
        const tileX = parseInt(tileCoord[1]);
        const tileY = -tileCoord[2] - 1;
        const tileZ = tileCoord[0];
        console.log("tile", tileX, tileY, tileZ)
        const t1le = tileDao.queryForTile(tileX, tileY, tileZ);  // (column, row, zoomLevel)
        if (t1le) {
          // console.log("t1le", t1le)
          const tileData = t1le.getTileData();
          const type = fileType(tileData); // png or jpeg
          console.log("type", type.mime)
          var binary = '';
          const len = tileData.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(tileData[i]);
          }
          const base64Data = btoa(binary);
          tile.getImage().src = 'data:' + type.mime + ';base64,' + base64Data;
        }
      },
      // other source config options from your snippet here, e.g. tileGrid
      tileGrid: tileGrid
    })
  });

  // console.log("tileLayer", tileLayer)
  // add layer to map
  map.addLayer(tileLayer);

  // Zoom to Extent -> extent of geopackage content
  // getTableContents -> data from table "gpkg_contents"
  const contents = gpkg.getTableContents(tableName);
  // console.log("Extent Contents", contents)
  map.getView().fit([contents.min_x, contents.min_y, contents.max_x, contents.max_y], { constrainResolution: true, nearest: true })
  // map.getView().fit([324701.0, 5632072.0, 328739.0, 5634781.0], { constrainResolution: true, nearest: true })
  // map.getView().fit([326913.4, 5633204.96, 327275.8, 5633567.4])
  // console.log("zoom", map.getView().getZoom())
  // console.log("extent", map.getView().calculateExtent(map.getSize()))
}


