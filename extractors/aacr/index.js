const request = require('request-promise').defaults({ jar: true });
const Extractor = require('../extractor');
const $ = require('cheerio');
const _ = require('lodash');
const moment = require("moment");

const abstractSource = 'AACR';
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

      abstract.authors = googleScholarEntry.authors;
      abstract.citedCount = googleScholarEntry.citedCount;
      abstract.citedUrl = googleScholarEntry.citedUrl;
      abstract.link = googleScholarEntry.url;
      abstract.source = abstractSource;

      if (googleScholarEntry.url.includes('.pdf')) {
        abstract.title = googleScholarEntry.title;
        abstract.pdf = googleScholarEntry.pdf;
        abstract.background = googleScholarEntry.description;

        return abstract;
      }

      try {
        abstract.pmid = $('meta[name="citation_pmid" i]','head', html).prop('content');
      } catch(err) {
        // do nothing for now
      }

      abstract.title = $('meta[name="dc.Title" i]','head', html).prop('content');
      abstract.sourceId = $('meta[name="citation_id" i]','head', html).prop('content');
      abstract.publisher = $('meta[name="dc.Publisher" i]','head', html).prop('content').trim();
      const sourceDate = $('meta[name="dc.Date" i]','head', html).prop('content');

      abstract.date = moment(sourceDate, "MMM-DD-YYYY").toISOString();
      abstract.background = $('meta[name="DC.Description" i]','head', html).prop('content');

      return abstract;
    })
}

const acceptedUrls = [
'aacrjournals.org'
];

module.exports = new Extractor(aacrExtractor, { acceptedUrls });
