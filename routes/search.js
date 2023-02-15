// All the const variables below like express, router, pp, passport, fs, eventEmmitter,
// MyEmitter, myEmitter, logEvents, queryEvents, and authDal are all npm packages

const express = require("express");
const router = express.Router();
// pp is the passport.js file used to check if the user is authenticated
const pp = require("../passport");
const searchDal = require("../services/search.dal");
const authDal = require("../services/auth.dal");
// This will bring in the "passport" npm package for use in this file
const passport = require("passport");
// This will bring in the "fs" or file structure global object no npm install required
const fs = require("fs");
// This will bring in the "events" global object no npm install required
const eventEmmitter = require("events");
// Create the class MyEmitter to define it, making sure to the first letter is upper case, this is for classes
class MyEmitter extends eventEmmitter {}
// This instantiates a new emitter object that will be needed to access the index page
const myEmitter = new MyEmitter();

// This allows routes.js to access the functions within the logEvents.js
const logEvents = require("../logging/logEvents");
const queryEvents = require("../logging/queries");

// Creating an dot addListener or dot on function, it will have name "routes", this could be anything and functions below can have different names
// to serve different purposes then there are in this case 3 parameters, event, level (ex: information, error), and a message that can be logged
myEmitter.on("status", (msg, theStatusCode) => {
  // Once the above part of the listeners has exicuted its block
  // the logEvents function in logEvents.js will fire and the parameters here will be sent over to be processed.
  logEvents(msg, theStatusCode);
});

myEmitter.on("query", (msg, theDatabase) => {
  // once the above part of the listeners has executed its block
  // the logEvents function in logEvents.js will fire and the parameters here will be sent over to be processed
  queryEvents(msg, theDatabase);
});

// This is the route for the search page, the get request will render the search.ejs page
// search/Initial Get: will be logged to the console if the DEBUG variable is set to true
// before the user has access to the search page they must be authenticated, if they are not
// they will be redirected to the login page
router.get("/", pp.checkAuthenticated, async (req, res, next) => {
  console.log("index.js: router.get(/) checkAuth | render search | ");
  if (DEBUG)
    console.log(
      "/search/ Initial Get: ",
      req.query.searchTerm,
      !req.query.searchTerm
    );
  // below is the error handling for the search.ejs page, if the user manually types in a url query param of a database that does not exist, or any other possible query params that cannot be handled
  // !req.query.searchTerm is the same as req.query.searchTerm === undefined and else next() moves on to the next middleware function
  // if !req.query.searchTerm is true then the user has not searched for anything yet so render the search.ejs page
  if (!req.query.searchTerm) {
    try {
      res.render("search.ejs");
    } catch {
      theStatusCode = 503;
      msg = `Error`;
      myEmitter.emit("status", msg, theStatusCode); //logEvents emitter.
      res.render("503.ejs");
    }
  } else {
    next();
  }
});

// this .get "/" is the same as the above .get "/" but this
// one is for when the user has searched for something
router.get("/", async (req, res) => {
  if (DEBUG) console.log("/search/ Next: ", req.query);
  // let movies is the variable that will hold the results from the search
  // .getMovies is the function that will be called from the search.dal.js file
  try {
    let movies = await searchDal.getMovies(
      req.query.searchTerm,
      req.query.database
    );
    // theDatabase is the variable that will hold the database that the user searched in so it can be logged
    theDatabase = req.query.database;
    // .passport.user is the user id that is stored in the current session
    msg = `User ID: ${req.session.passport.user} Search Term: ${req.query.searchTerm}`;
    myEmitter.emit("query", msg, theDatabase);

    // Error handling for ejs errors caused by results from an invalid search, for instance
    // if someone manually types in a url query param of a database that does not exist, or
    // any other possible query params that cannot be handled.
    res.render("results.ejs", { movies }, function (err, html) {
      if (err) {
        console.log(err);
        theStatusCode = 503;
        msg = `Error`;
        myEmitter.emit("status", msg, theStatusCode); //logEvents emitter.
        res.render("503.ejs");
      } else {
        res.send(html);
      }
    });
  } catch {
    theStatusCode = 503;
    msg = `Error`;
    myEmitter.emit("status", msg, theStatusCode); //logEvents emitter.
    res.render("503.ejs");
  }
});

module.exports = router; //Export the router.
