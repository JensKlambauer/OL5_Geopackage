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
// var BoundingBox = require('../node_modules/@ngageoint/geopackage/lib/boundingBox');

const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(4),
  projection: 'EPSG:25833',
  undefinedHTML: 'außerhalb',
});


proj4.defs('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
register(proj4);
let center = transform([12.54257, 50.82634], "EPSG:4326", "EPSG:25833");

var defaultZoomLevel = 0;
var urlGeosnDop = 'https://geodienste.sachsen.de/wms_geosn_dop-rgb/guest';
var sachsenDop = new TileLayer({
  title: 'DOP Sachsen',
  source: new TileWMS({
    projection: "EPSG:25833",
    // tileLoadFunction: function(tile, url) {
    //   console.log("tile", tile)
    //  },
    url: urlGeosnDop,
    params: {
      'LAYERS': 'sn_dop_020'
    }
  })
});
var map = new Map({
  controls: defaultControls({ attributionOptions: { collapsible: true } }).extend([mousePositionControl]),
  layers: [sachsenDop],
  target: 'map',
  view: new View({
    center: center,
    extent: [324701, 5627656.721348314, 331825.5522291621, 5634781], //transformExtent([12.365956, 50.585565, 12.908844, 50.9645759], 'EPSG:4326','EPSG:25833'),               
    projection: "EPSG:25833",
    //resolution: 100   
  })
});



// load geopackage (rivers example)
loadGeopackage('wmsWAD3.gpkg');
// loadGeopackage('http://ngageoint.github.io/GeoPackage/examples/rivers.gpkg');

// function to load the geopackage using xhr
function loadGeopackage(filepath) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", filepath, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function (oEvent) {
    var arrayBuffer = xhr.response;
    if (arrayBuffer) {
      var byteArray = new Uint8Array(arrayBuffer);
      // 
      loadByteArray(byteArray);
    }
  };
  xhr.send();
}

// handle geopackage (changed from documentation - https://github.com/ngageoint/geopackage-js)
function loadByteArray(array, callback) {
  // var db = new SQL.Database(array);
  console.log("try loadByteArray")
  GeoPackageAPI.open(array, function (err, gp) {
    // var geoPackage = new GeoPackage('', '', connection); dop25833Gl wmsWAD25833Gl
    console.log("DB Open")
    getTilesFromTable(gp, "wmsWAD25833Gl", defaultZoomLevel);
  });
}

// function to get tiles from table
function getTilesFromTable(gpkg, tableName, zoom) {
  // console.log("gpkg", gpkg)
  // console.log("tableName", tableName)
  var tileDao = gpkg.getTileDao(tableName);
  // console.log("tileDao", tileDao)
  var tms = tileDao.tileMatrixSet;
  // console.log("tms", tms)
  var tm = tileDao.getTileMatrixWithZoomLevel(zoom);
  // console.log("tm", tm)
  // create tile grid
  var tileGrid = createXYZ({
    extent: [tms.min_x, tms.min_y, tms.max_x, tms.max_y], // extent of geopackage content
    maxZoom: tileDao.maxZoom,
    minZoom: tileDao.minZoom,
    // resolutions: resolutions,
    tileSize: [tm.tile_width, tm.tile_height] // tile size in pixels
  });
  // console.log("tileGrid", tileGrid)

  // create tile retriever
  // var gpr = new GeoPackageTileRetriever(tileDao, tm.tile_width, tm.tile_height);
  // console.log("gpr", gpr)

  // setup tile layer
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
        // gpr.getTile(tileX, tileY, zoom, function(err, tileBase64DataURL) {
        //   tile.getImage().src = tileBase64DataURL;
        // });
        var tileCoord = url.split(',');
        var tileX = parseInt(tileCoord[1]);
        var tileY = -tileCoord[2] - 1;
        var tileZ = tileCoord[0];
        console.log("tile", tileX, tileY, tileZ)
        const t1 = tileDao.queryForTile(tileX, tileY, tileZ); //  (column, row, zoomLevel)
        if(t1) {
          // console.log("t1", t1)
          const tileData = t1.getTileData();
          // var type = fileType(tileData); // not working
          var binary = '';
          var bytes = tileData;
          var len = bytes.byteLength;
          for (var i = 0; i < len; i++) {
            binary += String.fromCharCode( bytes[ i ] );
          }
          var base64Data = btoa( binary );
          // console.log("data", 'data:image/png;base64,' + base64Data)
          tile.getImage().src = 'data:image/png;base64,' + base64Data;
        } 
        // console.log("map.getSize()", map.getSize())
        // let bounds = map.getView().calculateExtent(map.getSize());
        // var wgs84Bounds = transformExtent(bounds, 'EPSG:25833','EPSG:4326');
        // console.log("zoom", map.getView().getZoom())
        // console.log("wgs84Bounds", wgs84Bounds)        
        // const center = map.getView().getCenter();
        // const newView = new View({
        //   center: center,
        //   projection: "EPSG:25833",
        //   resolution: map.getView().getResolution()
        // });
        // const bounds = newView.calculateExtent([256, 256])
        // var wgs84Bounds = transformExtent(bounds, 'EPSG:25833', 'EPSG:4326');
        // console.log("wgs84Bounds", wgs84Bounds)

        // gpr.getTileWithWgs84BoundsInProjection(new BoundingBox(wgs84Bounds[0], wgs84Bounds[2], wgs84Bounds[1], wgs84Bounds[3]), tileZ, 'EPSG:25833')
        //   .then((tileBase64DataURL) => {
        //     // console.log("tileBase64DataURL", tileBase64DataURL)
        //     tile.getImage().src = tileBase64DataURL;
        //   });
      },
      // other source config options from your snippet here, e.g. tileGrid
      tileGrid: tileGrid
    })
  });

  // console.log("tileLayer", tileLayer)
  // add layer to map
  map.addLayer(tileLayer);
  // });  

  map.getView().fit([324701.0, 5632072.0, 328739.0, 5634781.0] )
  console.log("zoom", map.getView().getZoom())
  console.log("extent", map.getView().calculateExtent(map.getSize()))
}

