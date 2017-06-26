const request = require('request-promise').defaults({ jar: true });
const Extractor = require('../extractor');
const $ = require('cheerio');
const _ = require('lodash');
const moment = require("moment");

const aacrExtractor = function (googleScholarEntry, o, p, c) {
  const uriOptions = {
    uri: googleScholarEntry.url,
    headers: {
      'User-Agent': 'request',
    }
  };
  return request(uriOptions)
    .then(html => {
      const abstract = {};

      abstract.title = $('meta[name="dc.Title" i]','head', html).prop('content');
      abstract.sourceId = $('meta[name="citation_id" i]','head', html).prop('content');
      abstract.publisher = $('meta[name="dc.Publisher" i]','head', html).prop('content').trim();
      abstract.pmid = $('meta[name="citation_pmid" i]','head', html).prop('content');
      const sourceDate = $('meta[name="dc.Date" i]','head', html).prop('content');

      abstract.date = moment(sourceDate, "MMM-DD-YYYY").toISOString();
      abstract.background = $('meta[name="DC.Description" i]','head', html).prop('content');

      abstract.authors = googleScholarEntry.authors;
      abstract.citedCount = googleScholarEntry.citedCount;
      abstract.citedUrl = googleScholarEntry.citedUrl;
      abstract.link = googleScholarEntry.url;

      return abstract;
    })
}

const acceptedUrls = [
'aacrjournals.org'
];

module.exports = new Extractor(aacrExtractor, { acceptedUrls });
