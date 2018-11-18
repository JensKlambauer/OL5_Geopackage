var BoundingBox = require('../node_modules/@ngageoint/geopackage/lib/boundingBox');

// Test not work
var Gp25833TileRetriever = function(tileDao, width, height) {
    this.tileDao = tileDao;
    this.tileDao.adjustTileMatrixLengths();
  
    this.width = width;
    this.height = height;
  }
  
  module.exports = Gp25833TileRetriever;


  Gp25833TileRetriever.prototype.getTile = function (x, y, zoom) {
    var webMercatorBoundingBox = TileBoundingBoxUtils.getWebMercatorBoundingBoxFromXYZ(x, y, zoom);
    var gpZoom = this.determineGeoPackageZoomLevel(webMercatorBoundingBox, zoom);
    return this.getTileWithBounds(webMercatorBoundingBox, gpZoom, 'EPSG:3857');
  };

  Gp25833TileRetriever.prototype.getTileWithWgs84BoundsInProjection = function ( zoom, targetProjection) {
    // var targetBoundingBox = wgs84BoundingBox.projectBoundingBox('EPSG:4326', targetProjection);
    var box = new BoundingBox(minLon, maxLon, minLat, maxLat);
    return this.getTileWithBounds(targetBoundingBox, zoom, targetProjection);
  };
  
  