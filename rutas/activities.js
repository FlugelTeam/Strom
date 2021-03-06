var bodyParser = require('body-parser');
var moment = require('moment');
var _ = require('underscore');

module.exports = function activities (app,Activity,io,mongoose){

	app.use(bodyParser.json());

	app.get('/activity', getActualActivity);
	app.post('/activity', insertActivity);
	app.put('/activity', updateActivity);
	//app.get('/actualActivity', getActualActivity);


	function activitiesAll(req,res){
		Activity.find(function (err, array){
				res.json(array);
		});
	}

	function getActualActivity(req, res) {
			actualActivity(req.query.adviserId, function (err, activity) {
					if (err) return res.status(500).json(err);
					res.json(activity);
			});
	}

	function insertActivity(req, res) {
			actualActivity(req.body.adviserId, function (err, activity) {
					if (err) return res.status(500).json(err);

					if (!req.body.branchOffice.terminal || !req.body.role) return res.status(400).end();

					if (!_.size(activity)) {
							Activity.create({
									'adviser.adviserName': req.body.adviserName,
									'adviser.adviserLastName': req.body.adviserLastName,
									'adviser.adviserId': req.body.adviserId,
									'adviser.adviserEmail': req.body.adviserEmail,
									'day': moment(new Date()).format('YYYY-MM-DD'),
									'activity': {
											'activityEvent' : {
												eventCode: 10, eventName: 'closed'
											},
											'role' : req.body.role,
											'activityStartTime': new Date(),
											'activityEndTime' : new Date(0),
											'branchOffice' : {
														branchOfficesName: req.body.branchOffice.branchOfficesName,
														posCode: req.body.branchOffice.posCode,
														city: req.body.branchOffice.city,
														region: req.body.branchOffice.region,
														'terminal' : {
																terminalId: req.body.branchOffice.terminal.terminalId,
																terminalName: req.body.branchOffice.terminal.terminalName
														}
											},
									}

							}, function(err, obj) {
									if (err) return res.status(500).json(err);
									res.json(obj);
							});
					}else{
						res.json(activity);
					}
			});
	}

	function actualActivity(adviserId, callback) {
			var query = {};
			query.day = new Date(moment(new Date()).format('YYYY-MM-DD'));
			query['adviser.adviserId'] = adviserId;
			Activity.findOne(query, function(err, activity) {
					if (err) return callback(err, null);
					return callback(null, activity);
			});
	}

	function updateActivity(req, res){
			var id = req.body.idActivity;
			var activity = {eventCode: req.body.eventCode, eventName: req.body.eventName};

			//Encontrar actividad, tomar la info del ultimo, copiar role y branchOffice-terminal
			// $push nueva actividad con esa info
			Activity.findOne({_id: id}, function (err, activities) {
					var activityList = _.last(activities.activity);
					var role = req.body.role ? req.body.role : activityList.role;
					activityList.branchOffice.terminal = req.body.terminal ? req.body.terminal : activityList.branchOffice.terminal;

					// update activityEndTime
					Activity.findOneAndUpdate({'activity._id': activityList._id},
							{'$set': { 'activity.$.activityEndTime': new Date()} },
							function (err, result) {}
					);

					Activity.findByIdAndUpdate(id,{
						$push: {
								'activity': {
										'activityEvent' :	activity,
										'role' : role,
										'activityStartTime': new Date(),
										'activityEndTime' : new Date(0),
										'branchOffice' : activityList.branchOffice
								}
						}
					}, {new: true}, function(err, result){
							io.emit('updateActivity');
							return res.json(result);
					});
			});
	}

};
