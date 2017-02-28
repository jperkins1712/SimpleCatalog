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
  return filenames.map(function(fileName) {
    var fns = fileName.substring(0, fileName.length-4);
    if (filenames.length == 1) { return `<img src="${fileName}" alt="${fileName}"> </a>` }
    else return `<a href="templates/${fns}.html"> <img src="${fileName}" alt="${fileName}"> </a>`;
  });
}

/** @function serveImage
  * Serves an image
  * @param filename - the filename of the image to serve
  * @param req - the request object
  * @param res - the response object
  */
function serveImage(filename, req, res) {
  if (filename.includes('templates')) {
    filename = filename.substring(11, filename.length);
  }
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

/** @function buildClassPage
  * Builds the individual class page for an items
  * @param index - the index of the item being displayed in the array of items.
  * @param imgName - the name of the image to be displayed from the data_images folder
  * @param htmlName - the html file to be displayed
  */
function buildClassPage(obj, imgName, htmlName) {
  var singleArrayOfImageName = [imgName];
  return template.render('class.html', {
    title: obj.name,
    description: obj.description,
    imageTag: imageNamesToTags(singleArrayOfImageName)
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

/** @function serveClassPage
  * Serves the HTML page that shows the individual class information
  * @param req - request object
  * @param res - response object
  */
function serveClassPage(req, res) {

  var final = req.url.substring(11, req.url.length);
  var newFinal = final.substring(0, final.length-5)
  var num = 2;
  var json = JSON.parse(fs.readFileSync('data/' + newFinal + '.json'));
  var imageName = newFinal + json.imageType;

  res.setHeader('Content-Type', 'text/html');
  console.log(num + " " + imageName + " " + final);
  res.end(buildClassPage(json, imageName, final));
}

/** @function uploadObject
  * Processes an http POST request
  * @param req - the request object
  * @param res - the response object
  */
function uploadObject(req, res) {
  multipart(req, res, function(err, content) {
    console.log("4");

    //if (err) {
    //  console.error("no file");
    //  res.statusCode = 500;
    //  res.end();
    //  return;
    //}
    // this was the only way i could get it to work... the error is being passed the request. Im afraid to change anything because its kind of working.
    console.log(err.body.name); console.log(err.body.description);
    var nospacename = err.body.name.replace(" ", "");

    var info = {};
    info['name'] = err.body.name;
    info['description'] = err.body.description;
    info['image'] = '/data_images/' + err.body.fileupload.filename;
    info['tag'] = nospacename;
    info['imageType'] = '.png';

    fs.writeFile('data_images/' + err.body.fileupload.filename, err.body.fileupload.data, function(err) {
      if(err) {
        console.error(err);
        res.statusCode = 500;
        res.end();
        return;
      }
      serveCatalog(req, res);
    });
    console.log(JSON.stringify(info));
    fs.writeFile('data/' + nospacename + '.json', JSON.stringify(info), function(err) {
      if (err) {
        console.error(err);
        return;
      };
      console.log("File has been created.");
    });

    //var temp = JSON.parse(fs.readFileSync('data/' + nospacename + '.json'));
    //console.log(temp);
    //data.push(temp);
  });

}

// taken and modified from http://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
function parseQuery(qstr) {
        var query = {};
        var a = (qstr[0] === '?' ? qstr.substr(1) : qstr).split('&');
        for (var i = 0; i < a.length; i++) {
            var b = a[i].split('=');
            query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
        }
        return query;
}

function jsonFromQuery(query) {

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
    // handle title change
    var matches = /title=(.+)($|&)/.exec(urlParts.query);
    if (urlParts.query.includes('title=')) {
      if(matches && matches[1]){
        config.title = decodeURIComponent(matches[1]);
        fs.writeFile('config.json', JSON.stringify(config));
      }
    }
  }

  if (req.method == 'POST') {
    // handle query
    uploadObject(req, res);
  }
  else if (urlParts.pathname === '/' || urlParts.pathname === '/catalog') {
    if (req.method == 'GET') {
      serveCatalog(req, res);
    }
  }
  else if (urlParts.pathname.includes('/templates') && !urlParts.pathname.includes('catalog') && !urlParts.pathname.includes('.png')) {
    serveClassPage(req, res);
  }
  else if (urlParts.pathname.includes('/catalog.css')) {
    res.setHeader('Content-Type', 'text/css');
    res.end(stylesheet);
  }
  else {
    serveImage(req.url, req, res);
  }
}

// create server
var server = http.createServer(handleRequest);
server.listen(port, function(){
  console.log("Server listening on port " + port);
})
