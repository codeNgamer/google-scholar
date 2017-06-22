const request = require('request-promise').defaults({ jar: true });
const Extractor = require('../extractor');
const $ = require('cheerio');
const _ = require('lodash');

const aacrExtractor = function (googleScholarEntry, o, p, c) {
  const uriOptions = {
    uri: googleScholarEntry.url,
    resolveWithFullResponse :true,
    simple: true
  };
  return request(uriOptions)
    .then(html => {

      response.headers['set-cookie']
      console.log(html);
      // console.log(o);
      // console.log(p);
      // console.log(c);
      // return {};
      const abstract = {};

      // const abstractHtmlContainer = $(abstractContainerClass, context, html).html();

      // extracts information from sections if available and stores in abstract object
      // extractInfoFromSections(abstractHtmlContainer, abstract);

      // abstract.title = $('meta[name="dc.Title" i]','head', html).prop('content');
      // abstract.sourceId = $('meta[name="citation_id" i]','head', html).prop('content');
      // abstract.publisher = $('meta[name="dc.Publisher" i]','head', html).prop('content').trim();
      // abstract.pmid = $('meta[name="citation_pmid" i]','head', html).prop('content');
      // abstract.sourceDate = $('meta[name="dc.Date" i]','head', html).prop('content');
      // abstract.background = $('meta[name="dc.Date" i]','head', html).prop('content');

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
