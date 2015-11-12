var bodyParser = require('body-parser');
var moment = require('moment');

module.exports = function serviceLevel (app, Token, io){

	app.use(bodyParser.json());

	app.get('/serviceLevel', getServiceLevel); // obtiene el nivel de servicio de una muestra determinada de turnos, por tienda y entre un rango de fechas configurando un factor de tiempo
	app.get('/slByDay', slByDay); // Obtiene el nivel de servicio por cada dia, por sucursal, entre un rango de fechas con un factor de tiempo
	app.get('/slByHour', getServiceLevelByHour); //Obtiene el nivel de servicio Hora a Hora para un dia determinado , por tienda.


	function  getServiceLevel (req,res){ // Acomulado del  dia por tienda y pais.

		var params = {};
		var query = {
			'token.state.stateCode': 3 
		};

		if (req.query.posCode) query['token.branchOffice.posCode']= req.query.posCode ;

		if (req.query.startDate && req.query.endDate){
			query['token.infoToken.logEndToken'] = {
				'$gte': req.query.startDate,
				'$lte':req.query.endDate
			};
		}
		else {
			query['token.infoToken.logEndToken']= {'$lte':new Date(moment(new Date()).format('YYYY-MM-DD'))};
		}

		params.timeFactor = req.query.timeFactor ? req.query.timeFactor : 10;

		Token.find(query,function (err,arr){
			console.log(arr.length);

			Token.aggregate(
				[
					{ $match: query	},
					{ $project: {
						totalAtention:{ $divide: [ {$subtract:['$token.infoToken.logEndToken','$token.infoToken.logCreationToken']}, 60000 ] }
						}
					},
					{ $match: {
						'totalAtention':{ $lte: params.timeFactor}
						}
					}
				],function (err,sample){
					var sl = (sample.length / arr.length)*100;
					res.json(sl);
				}
			);
		});
	}

	function slByDay (req,res){

		var params = {};
		var query = {
			'token.state.stateCode': 3 
		};

		if (req.query.posCode) query['token.branchOffice.posCode']= req.query.posCode ;
	

		if (req.query.startDate && req.query.endDate){
			query['token.infoToken.logEndToken'] = {
				'$gte': req.query.startDate,
				'$lte':req.query.endDate
			};
		}
		else {
			query['token.infoToken.logEndToken']= {'$lte':new Date(moment(new Date()).format())};
		}

		params.timeFactor = req.query.timeFactor ? req.query.timeFactor : 10;

			Token.aggregate(
				[
					{ $match: query	},
					{ $project: {
							logEnd:'$token.infoToken.logEndToken',
							totalAtention:{ $divide: [ {$subtract:['$token.infoToken.logEndToken','$token.infoToken.logCreationToken']}, 60000 ] }
						}
					},
					{ $project:{
						totalTime:'$totalAtention',
						logEnd:'$logEnd',
						puntual:{
									$cond:{if:{$lte:['$totalAtention',params.timeFactor]},then:1,else:0}
								}
						}
					},					
					{ $group:
						{
							_id: {day: { $dayOfMonth: "$logEnd"},mes:{$month:"$logEnd"}},
							total:{$avg:'$totalTime'},
							numerador:{$sum:'$puntual'},
							denominador: { $sum: 1 }					
						}
					}
					
				],function (err,sample){
					res.json(sample);
					}
			);

	}

	function getServiceLevelByHour (req,res) {

		var params = {};
		var query = {
			'token.state.stateCode': 3 
		};

		if (req.query.posCode) query['token.branchOffice.posCode']= req.query.posCode ;
	

		if (req.query.currentDay){
			query['token.infoToken.logEndToken'] = req.query.currentDay;		
		}
		else {
			query['token.infoToken.logEndToken']= {
				'$gte':new Date(moment(new Date()).format('YYYY-MM-DD')),
				'$lte':new Date(moment(new Date()).format())
			};
		}

		params.timeFactor = req.query.timeFactor ? req.query.timeFactor : 10;
		console.log(query);
			Token.aggregate(
				[
					{ $match: query	},
					{ $project: {
							logEnd:'$token.infoToken.logEndToken',
							totalAtention:{ $divide: [ {$subtract:['$token.infoToken.logEndToken','$token.infoToken.logCreationToken']}, 60000 ] }
						}
					},
					{ $project:{
						totalTime:'$totalAtention',
						logEnd:'$logEnd',
						puntual:{
									$cond:{if:{$lte:['$totalAtention',params.timeFactor]},then:1,else:0}
								}
						}
					},					
					{ $group:
						{
							_id: {hora: { $hour: "$logEnd"}},
							total:{$avg:'$totalTime'},
							numerador:{$sum:'$puntual'},
							denominador: { $sum: 1 }					
						}
					}
				],function (err,sample){
					res.json(sample);
					
				}
			);

	}




};
