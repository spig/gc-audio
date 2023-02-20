'use strict';
//
        // "https:\u002F\u002Fwww.churchofjesuschrist.org\u002Fstudy\u002Fapi\u002Fv3"

const https = require('https');
var async = require('async');
var fs = require('fs');
const cheerio = require('cheerio');

var talkUrls = [];

var rootUrl = 'https://www.churchofjesuschrist.org';
var apiBaseUrl = rootUrl + '/study/api/v3/language-pages/type/content';

//var defaultGCUri = rootUrl + '/study/general-conference/speakers/russell-m-nelson?lang=eng';


var gcUri = (function(urlParam) {
    if (urlParam && urlParam.match('^http')) {
        return urlParam;
//        if (urlParam.match('&json')) {
//            return urlParam;
//        } else {
//            // the lang parameter should already be in the url so '&' will be ok
//            return urlParam + '&json';
//        }
    } else {
        console.log('Please provide the URL to extract audio from');
        process.exit(1);
    }
})(process.argv[2]);

var gcLang = (function(urlParam) {
    if (urlParam && urlParam.match('^http')) {
        const url = new URL(urlParam);
        return url.searchParams.get('lang') || 'eng';
    } else {
        return 'eng';
    }
})(process.argv[2]);

https.get(gcUri, res => {
    let data = [];
    console.log('Status Code:', res.statusCode);

    res.on('data', chunk => {
        data.push(chunk);
    });

    res.on('end', () => {
        console.log('Response ended');
        getTalkUrls(Buffer.concat(data).toString());
        //        console.log(Buffer.concat(data).toString());
    });
}).on('error', err => {
    console.log('Error: ', err.message);
});

var getTalkUrls = function(html) {
    const $ = cheerio.load(html);
    $('a').filter(function(i, elem) {
        let href = $(this).attr('href');
        if (typeof href !== 'undefined' && href.match(/\/study\/general-conference/)) {
//            '/study/general-conference/1988/10/addiction-or-freedom',
            var uri = href.replace(/^\/study/, '');
            talkUrls.push(apiBaseUrl + '?lang=' + gcLang + '&uri=' + uri);
        }
    });
    console.log(talkUrls);
    async.parallel(
        talkUrls.map(function(url) {
            return function(callback) {
                https.get(url, res => {
                    let data = [];

//                    console.log('Status Code:', res.statusCode);

                    if (res.statusCode != 200) {
                        callback('Unexpected status code: ' + res.statusCode);
                        return;
                    }

                    res.on('data', chunk => {
                        data.push(chunk);
                    });

                    res.on('end', () => {
                        // {
                            // "meta":{
                                // "title":"Children of the Covenant",
                                // "canonicalUrl":"/general-conference/1995/04/children-of-the-covenant?lang=eng",
                                // "contentType":"text/html",
                                // "audio":[{
                                    // "mediaUrl":"https://media2.ldscdn.org/assets/general-conference/april-1995-general-conference/1995-04-2080-elder-russell-m-nelson-64k-eng.mp3",
                                    // "variant":"audio"}],
                                // "pageAttributes":{
                                    // "data-asset-id":"821fc2ca202cb8ad3dca384c7efe89ac55a7d0a8",
                                    // "data-aid":"28796081",
                                    // "data-aid-version":"13",
                                    // "data-content-type":"general-conference-talk",
                                    // "data-uri":"/general-conference/1995/04/children-of-the-covenant",
                                    // "lang":"eng",
                                    // "data-orig-id":"821fc2ca202cb8ad3dca384c7efe89ac55a7d0a8",
                                    // "xmlns:xsi":"http://www.w3.org/2001/XMLSchema-instance"},
                                // "ogTagImageUrl":"https://mediasrv.churchofjesuschrist.org/media-services/GA/thumbnail/2245802231001",
                                // "scopedClassName":"global-template-mobile_article",
                            // "content":{
                                // "head":{
                                    // "page-meta-social":{"pageMeta":{"title":"Children of the Covenant",
                                        // "description":"Russell M. Nelson delivers a message titled &quot;Children of the Covenant.&quot;"},
                                        // "pageSocial":{
                                            // "title":"Children of the Covenant",
                                            // "description":"Russell M. Nelson delivers a message titled &quot;Children of the Covenant.&quot;"}},
                                    //
                                    //
                            // "tableOfContentsUri":"/general-conference/1995/04","uri":"/general-conference/1995/04/children-of-the-covenant"
                                    //
                                    //
//                        console.log('Response ended');
                        //console.log(Buffer.concat(data).toString());
                        const json = JSON.parse(Buffer.concat(data).toString());
//                        console.log(json.meta.title);
//                        console.log(json.meta.pageAttributes['data-content-type']);
//                        console.log(url);
                        const canonicalUrlParts = json.meta.canonicalUrl.split('/');

                        const isGeneralConference = canonicalUrlParts[1] == 'general-conference';
                        const year = canonicalUrlParts[2];
                        const monthDigits = canonicalUrlParts[3];

                        if (monthDigits == '04') {
                            var month = "April";
                        } else if (monthDigits == '10') {
                            var month = "October";
                        }


                        var talkObj = {};

                        if (isGeneralConference) {
                            const event = month + ' ' + year + ' General Conference';
                            const eventDate = year + '-' + monthDigits;
                        talkObj["event"] = event;
                        talkObj["eventDate"] = eventDate;
                        }

//                        console.log(isGeneralConference, year, month);

//                        console.log("canonical url: " + json.meta.canonicalUrl);

                        talkObj["id"] = json.meta.canonicalUrl;
                        talkObj["title"] = json.meta.title;
                        if (json.meta.audio) {
                            talkObj["url"] = json.meta.audio[0].mediaUrl;
//                            console.log(talkObj);
                            callback(null, talkObj);
                            return;
                        } else {
//                            console.log(json);
                        }

//                        console.log('');
//                        console.log('');
//                        console.log('');
                        callback("No talk found here");
                    });
                }).on('error', err => {
                    console.log('Error: ', err.message);
                    callback(err);
                });
            };
        }),
        function(err, results) {
            if (err) {
                console.log(err);
                return;
            }

            console.log('found results...');
            console.log(results);
        }
    );
}



//request({
//        uri: gcUri,
//        json: true,
//        timeout: 5000
//    },
//    function(err, response, jsonBody) {
//        if (!err && response.statusCode === 200) {
//            try {
//                var sessions = jsonBody.subComponents.sessions || [];
//                sessions.forEach(function(session) {
//                    var talks = session.subComponents.tile;
//
//                    talks.forEach(function(talk) {
//                        talkUrls.push(talk.link);
//                    });
//                });
//
//                var speakers = jsonBody.subComponents.speakers || [];
//                speakers.forEach(function(speaker) {
//                    var talks = speaker.subComponents.tile;
//                    talks.forEach(function(talk) {
//                        talkUrls.push(talk.link);
//                    });
//                });
//
//                async.parallel(
//                    talkUrls.map(function(url) {
//                        return function(callback) {
//                            request({
//                                uri: rootUrl + url,
//                                json: true,
//                                timeout: 30000
//                            },
//                            function(err, response, body) {
//                                if (!err && response.statusCode === 200) {
//                                    const $ = cheerio.load(body);
//                                    let mp3URL = null
//                                    $('a').filter(function(i, elem) {
//                                        let href = $(this).attr('href');
//                                        if (typeof href !== 'undefined' && href.match(/\.mp3/)) {
//                                            mp3URL = href;
//                                        }
//                                    });
//                                    return callback(null, mp3URL);
//                                }
//
//                                callback(err);
//                            });
//                        };
//                    }),
//                    function(err, results) {
//                        if (err) {
//                            console.log(err);
//                            return;
//                        }
//
//                        results.forEach(function(audioUrl) {
//                            if (audioUrl != null) {
//                                var urlParts = audioUrl.split('/');
//                                var audioFilename = urlParts[urlParts.length-1].split('?')[0];
//                                console.log('saving ' + audioFilename);
//                                request
//                                    .get(audioUrl)
//                                    .on('error', function(err) {
//                                        console.log('Error: ' + err);
//                                    })
//                                    .pipe(fs.createWriteStream(audioFilename, { defaultEncoding: 'binary' }));
//                            }
//                        });
//                    }
//                );
//            } catch (ex) {
//                console.log(ex);
//            }
//        }
//    }
//);
