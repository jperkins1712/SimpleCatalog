/**
  * server.js
  * Defines the server for the simple catalog
  */

"use strict";

// global variables
var multipart = require('./multipart');
var http = require('http');
var url = require('url');
var fs = require('fs');
var template = require('./template');
var port = 1712;

// cached files
var config = JSON.parse(fs.readFileSync('config.json'));
var stylesheet = fs.readFileSync('catalog.css');
var dk = JSON.parse(fs.readFileSync('data/dk.json'));
var druid = JSON.parse(fs.readFileSync('data/druid.json'));
var monk = JSON.parse(fs.readFileSync('data/monk.json'));
var priest = JSON.parse(fs.readFileSync('data/priest.json'));
var rogue = JSON.parse(fs.readFileSync('data/rogue.json'));

var data = [dk, druid, monk, priest, rogue];
template.loadDir('templates');

// functions

/** @function getImageNames
  * Gets the filenames for all the images in the data_images directory and supplies them to the callback.
  * @param callback - function that takes an error and array of filenames as parameters
  */
function getImageNames(callback) {
  fs.readdir('data_images/', function(err, fileNames){
    if (err) callback(err, undefined);
    else callback(false, fileNames);
  });
}

/** @function imageNamesToTags
  * Takes array of image names and returns array of HTML img tags
  * @param filenames - the image filenames
  * @return - an array of HTML img tags
  */
function imageNamesToTags(filenames) {
  console.log(filenames);
  return filenames.map(function(fileName) {
    var fns = fileName.substring(0, fileName.length-4);
    return `<a href="templates/${fns}.html"> <img src="${fileName}" alt="${fileName}"> </a>`;
  });
}

/** @function serveImage
  * Serves an image
  * @param filename - the filename of the image to serve
  * @param req - the request object
  * @param res - the response object
  */
function serveImage(filename, req, res) {
  fs.readFile('data_images/' + decodeURIComponent(filename), function(err, data){
    if(err) {
      console.error(err);
      res.statusCode = 404;
      res.statusMessage = "Resource not found";
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'image/*');
    res.end(data);
  });
}

/** @function buildCatalog
  * Builds the HTML string for the catalog webpage.
  * @param imageTags - the HTML for the individual thumbnail images.
  */
function buildCatalog(imageTags) {
  return template.render('catalog.html', {
    title: config.title,
    imageTags: imageNamesToTags(imageTags).join('')
  });
}

/** @function serveCatalog
  * Serves the HTML page that shows the catalog of items
  * @param req - the request object
  * @param res - the response object
  */
function serveCatalog(req, res) {
  getImageNames(function(err, imageNames){
    if (err) {
      console.error(err);
      res.statusCode = 500;
      res.statusMessage = 'Server error';
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(buildCatalog(imageNames));
  })
}

/** @function uploadObject
  * Processes an http POST request
  * @param req - the request object
  * @param res - the response object
  */
function uploadObject(req, res) {

}

/** @function handleRequest
  * Handles http requests.
  * @param req - incoming requests
  * @param res - outgoing response
  */
function handleRequest(req, res) {
  // split url
  var urlParts = url.parse(req.url);

  if(urlParts.query){
    var matches = /title=(.+)($|&)/.exec(urlParts.query);
    if(matches && matches[1]){
      config.title = decodeURIComponent(matches[1]);
      var newTitle = JSON.stringify(config);
      newTitle = newTitle.replace(/\+/g, ' ');
      console.log(newTitle);
      fs.writeFile('config.json', newTitle);
    }
  }

  switch(urlParts.pathname) {
    case '/':
    case '/catalog':
      if (req.method == 'GET') {
        serveCatalog(req, res);
      } else if (req.method == 'POST') {
        uploadObject(req, res);
      }
      break;
    case '/catalog.css':
      res.setHeader('Content-Type', 'text/css');
      res.end(stylesheet);
      break;
    default:
      serveImage(req.url, req, res);
  }
}

// create server
var server = http.createServer(handleRequest);
server.listen(port, function(){
  console.log("Server listening on port " + port);
})
