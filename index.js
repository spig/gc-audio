'use strict';

var request = require('request');
var async = require('async');
var fs = require('fs');
const cheerio = require('cheerio');

var talkUrls = [];

var rootUrl = 'https://www.churchofjesuschrist.org';

var defaultGCUri = rootUrl + '/general-conference?lang=eng&json';

var gcUri = (function(urlParam) {
    if (urlParam && urlParam.match('^http')) {
        if (urlParam.match('&json')) {
            return urlParam;
        } else {
            // the lang parameter should already be in the url so '&' will be ok
            return urlParam + '&json';
        }
    } else {
        return defaultGCUri;
    }
})(process.argv[2]);

request({
        uri: gcUri,
        json: true,
        timeout: 5000
    },
    function(err, response, jsonBody) {
        if (!err && response.statusCode === 200) {
            try {
                var sessions = jsonBody.subComponents.sessions || [];
                sessions.forEach(function(session) {
                    var talks = session.subComponents.tile;

                    talks.forEach(function(talk) {
                        talkUrls.push(talk.link);
                    });
                });

                var speakers = jsonBody.subComponents.speakers || [];
                speakers.forEach(function(speaker) {
                    var talks = speaker.subComponents.tile;
                    talks.forEach(function(talk) {
                        talkUrls.push(talk.link);
                    });
                });

                async.parallel(
                    talkUrls.map(function(url) {
                        return function(callback) {
                            request({
                                uri: rootUrl + url,
                                json: true,
                                timeout: 30000
                            },
                            function(err, response, body) {
                                if (!err && response.statusCode === 200) {
                                    const $ = cheerio.load(body);
                                    let mp3URL = null
                                    $('a').filter(function(i, elem) {
                                        let href = $(this).attr('href');
                                        if (typeof href !== 'undefined' && href.match(/\.mp3/)) {
                                            mp3URL = href;
                                        }
                                    });
                                    return callback(null, mp3URL);
                                }

                                callback(err);
                            });
                        };
                    }),
                    function(err, results) {
                        if (err) {
                            console.log(err);
                            return;
                        }

                        results.forEach(function(audioUrl) {
                            if (audioUrl != null) {
                                var urlParts = audioUrl.split('/');
                                var audioFilename = urlParts[urlParts.length-1].split('?')[0];
                                console.log('saving ' + audioFilename);
                                request
                                    .get(audioUrl)
                                    .on('error', function(err) {
                                        console.log('Error: ' + err);
                                    })
                                    .pipe(fs.createWriteStream(audioFilename, { defaultEncoding: 'binary' }));
                            }
                        });
                    }
                );
            } catch (ex) {
                console.log(ex);
            }
        }
    }
);
