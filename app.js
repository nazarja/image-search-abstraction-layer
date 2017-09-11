var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;
var mongoURL = 'mongodb://localhost:27017/recentImageSearches';
var request = require('request');
var port = process.env.PORT || 3000;
var staticFiles = __dirname + '/public/';
var indexHTML = __dirname + '/views/index.html';
var timestamp;
var query;

// Require cx and key
require('dotenv').config();

// Serve up any static files
app.use(express.static(staticFiles));

// Serve up the index html file
app.get('/', function(req, res) {
    res.sendFile(indexHTML);
});

// Get search query and do something with parameters
app.get('/search/:query', function(req, res) {
    // Assign the query parameter to a variable
    query = req.params.query;
    // Create a current timestamp
    timestamp = new Date();
    // Check if offset exists and set Interger
    if (req.query.offset) {
        var offset = req.query.offset * 10;
    }
    else {
        var offset = 1;
    }

    // Create the full search  request to send to google  cse api
    var searchQuery = `q=${query}&num=10&start=${offset}&filter=1&searchType=image&imgType=photo`
    var searchRequest = process.env.IS_FULL_URL+ searchQuery; 

    // Test Request and print to google serch engine
    request.get(searchRequest, function(error, response, body) {
        if (error) throw error;
        if (response.statusCode == 200) {
           body = JSON.parse(body);
           var obj = []
           for (var i = 0; i < 10; i++) {
               obj.push({
                   "Website": body.items[i].displayLink,
                   "Image Link": body.items[i].link,
                   "Image Text": body.items[i].snippet,
                   "Context Link": body.items[i].image.contextLink,
                   "Thumbnail Image": body.items[i].image.thumbnailLink 
               });
           }
           res.json(obj);
        }
        else {
            res.redirect('http://localhost:3000');
        }
    }); // End of Request Function

    // Connect to database and insert recent object
    mongo.connect(mongoURL, function(err, db) {
        if (err) throw err;
        var collection = db.collection('recent');
        // insert into collection db
        collection.insertOne({
            "Search Term": query,
            "Timestamp": timestamp,
            "Date": timestamp.toDateString()
        },function(err, result){
            if (err) throw err;
            db.close();
        });
    }); // End of Mongo Connect

});

// Serve up a list of the most recently used serach terms
app.get('/recent', function(req, res) {

    // Connect to MongoDB and serve up to last 10 most recent entries
    mongo.connect(mongoURL, function(err, db) {
        if (err) throw err;

        db.collection('recent').find({}, {'_id': false}).limit(10).sort({
            $natural: -1
        })
        .toArray(function(err, result) {
            if (err) throw err;
            db.close();
            res.send(result);
        }); 
    })  
});

// Listen on prt for connections
app.listen(port, () => {
    console.log(`Server is listening on port: ${port}`);
});
