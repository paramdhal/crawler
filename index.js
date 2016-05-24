'use strict';

const path = require('path'),
  urlParser = require('url'),
  Crawler = require('simplecrawler');

const query = "https://www.redsnapper.net";

const redirectedUrls = new Set();
const url = urlParser.parse(query);
const crawler = new Crawler(url.hostname, url.path, url.port);
var originalEmit = crawler.emit;
    crawler.emit = function(evtName, queueItem) {
        crawler.queue.complete(function(err, completeCount) {
            if (err) {
                throw err;
            }

            crawler.queue.getLength(function(err, length) {
                if (err) {
                    throw err;
                }

                console.log("fetched %d of %d — %d open requests, %d open listeners".green,
                    completeCount,
                    length,
                    crawler._openRequests,
                    crawler._openListeners);
            });
        });

        console.log(evtName, queueItem ? queueItem.url ? queueItem.url : queueItem : null);
        originalEmit.apply(crawler, arguments);
    };

if (url.protocol) {
  // Node's url parser includes a : at the end of protocol, simplecrawler expects no :.
  crawler.initialProtocol = url.protocol.slice(0, -1);
}

crawler.maxDepth =2;
crawler.downloadUnsupported = false;
crawler.allowInitialDomainChange = true;
crawler.parseHTMLComments = false;
crawler.addFetchCondition(function(parsedURL) {
  const extension = path.extname(parsedURL.path);
  return ['.html','.php',''].indexOf(extension) !== -1;
});

crawler.on('fetchredirect', (queueItem, parsedURL, response) => {
  redirectedUrls.add(response.headers.location);
  console.log(response.headers.location);
});


crawler.on('fetchcomplete', (queueItem) => {
  const pageMimeType = /^(text|application)\/x?html/i;
  const url = queueItem.url;
  if (redirectedUrls.has(url)) {
    console.log('Crawler skipping redirected URL %s', url);
  } else if (query === url) {
    console.log('Crawler skipping initial URL %s', url);
  } else if (pageMimeType.test(queueItem.stateData.contentType)) {
    console.log('Crawler found URL %s', url);
  } else {
    console.log('Crawler found non html URL %s', url);
  }
});

const resolve = ()=> console.log("Finished");

crawler.on('complete', resolve);
crawler.start();