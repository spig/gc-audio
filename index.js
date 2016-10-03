var request = require('request');

request({
		uri: 'https://www.lds.org/general-conference/2016/10?lang=eng&json',
		json: true
	},
	function(err, response, jsonBody) {
		if (!err && response.statusCode == 200) {
			try {
				var sessions = jsonBody.subComponents.sessions;
				sessions.forEach(function(session) {
					var talks = session.subComponents.tile;
					talks.forEach(function(talk) {
						console.log(talk.link);
					});
				});
			} catch (ex) {
				console.log(ex);
			}
		}
	}
);
