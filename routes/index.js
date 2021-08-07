var express = require("express");
var router = express.Router();

// Initialize MongoDB client
var MongoClient = require("mongodb").MongoClient;
// URI to access database
const url = "";

// Currently unitialized collection variable
var qdb;

// Categories array to be used to display corresponding category in category_ids
var categories = [
	"History",
	"Literature",
	"Science",
	"Current Events",
	"Fine Arts",
	"Geography",
	"Mythology",
	"Philosophy",
	"Religion",
	"Social Science",
];
var category_ids = [18, 15, 17, 26, 21, 20, 14, 25, 19, 22];

// Connect to MongoDB
MongoClient.connect(url, function (err, db) {
	if (err) throw err;
	qdb = db.db("quizbowldb");
	console.log("MongoDB ready!");
});

// Render index, which is the landing page
router.get("/", (req, res, next) => {
	res.render("index");
});

// Render the tossups page
router.get("/tossups", (req, res, next) => {
	var tossup,
		answer,
		category,
		tourney,
		difficulty,
		points = req.query.points;

	// Set points to 0 if user has scored no points yet
	if (points == null || points == undefined) {
		points = 0;
	}

	// If no difficulty or difficulty set to all, don't do anything
	if (req.query.diff && req.query.diff != "all") {
		var diff_full;

		// Check URL parameter for difficulty parameter and set difficulty accordingly.
		if (req.query.diff == "ms") {
			diff_full = "middle_school";
			difficulty = "Middle School";
		} else if (req.query.diff == "hs") {
			diff_full = "high_school";
			difficulty = "High School";
		} else if (req.query.diff == "co") {
			diff_full = "college";
			difficulty = "College";
		} else if (req.query.diff == "op") {
			diff_full = "open";
			difficulty = "Open";
		}

		// Search for tournaments with corresponding difficulty
		qdb.collection("tournaments")
			.aggregate([
				{ $match: { difficulty: { $regex: diff_full } } },
				{ $sample: { size: 1 } },
			])
			.toArray((err, tournaments) => {
				if (err) throw err;

				tourney = tournaments[0].name;

				// Check if tournament id is valid
				qdb.collection("tossups")
					.find({ tournament_id: tournaments[0].id })
					.limit(5)
					.toArray((err, result) => {
						// If tournament is invlaid, reprocess request again
						if (result.length == 0) {
							res.redirect(req.url);
						} else {
							// Get one tossup from tossups with corresponding tournament
							qdb.collection("tossups")
								.aggregate([
									{
										$match: {
											tournament_id: tournaments[0].id,
											text: { $exists: true },
										},
									},
									{ $sample: { size: 1 } },
								])
								.toArray((err, result) => {
									if (err) throw err;

									// Set question, answer, and category to values from returned tossup
									tossup = result[0].text;
									answer = result[0].answer;
									if (
										category_ids.includes(
											result[0].category_id
										)
									) {
										category =
											categories[
												category_ids.indexOf(
													result[0].category_id
												)
											];
									} else {
										category = "N/A";
									}

									// Render tossups view
									res.render("tossups", {
										tossup,
										answer,
										category,
										tourney,
										difficulty,
										diff_short: req.query.diff,
										points,
									});
								});
						}
					});
			});
	} else {
		// Code that executes if no category is selected
		qdb.collection("tossups")
			.aggregate([
				{
					$match: {
						text: { $exists: true },
					},
				},
				{ $sample: { size: 1 } },
			])
			.toArray((err, result) => {
				if (err) throw err;

				// First set question, answer, and category from tossup
				tossup = result[0].text;
				answer = result[0].answer;
				if (category_ids.includes(result[0].category_id)) {
					category =
						categories[category_ids.indexOf(result[0].category_id)];
				} else {
					category = "N/A";
				}

				// Then get difficulty from corresponding tournament
				qdb.collection("tournaments").findOne(
					{ id: result[0].tournament_id },
					(err, tournament) => {
						if (err) throw err;

						tourney = tournament.name;

						if (tournament.difficulty.includes("open")) {
							difficulty = "Open";
						} else if (
							tournament.difficulty.includes("high_school")
						) {
							difficulty = "High School";
						} else if (
							tournament.difficulty.includes("middle_school")
						) {
							difficulty = "Middle School";
						} else if (tournament.difficulty.includes("college")) {
							difficulty = "College";
						}

						// Render tossups view
						res.render("tossups", {
							tossup,
							answer,
							category,
							tourney,
							difficulty,
							diff_short: null,
							points,
						});
					}
				);
			});
	}
});

module.exports = router;
