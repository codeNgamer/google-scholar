const request = require('request-promise').defaults({ jar: true });
const Extractor = require('../extractor');
const libxmljs = require("libxmljs");
const $ = require('cheerio');
const _ = require('lodash');
const moment = require("moment");

const pubmedEfetch = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed';
const returnMode = '&retmode=xml';
const abstractSource = 'PUBMED';

const pubmedExtractor = function (googleScholarEntry) {
  const uriOptions = {
    uri: googleScholarEntry.url,
    resolveWithFullResponse :true,
    simple: true
  };
  return request(googleScholarEntry.url)
    .then(html => {
      // get pmid from page so we can get actual article from pubmedEfetch
      // so we dont have to scrape
      const pmid = $('meta[name="citation_pmid" i]','head', html).prop('content');
      return pmid;
    })
  // get article from efetch
    .then(pmid => request(`${pubmedEfetch}&id=${pmid}${returnMode}`))
  // parse abstract xml to json
    .then(abstractXml => libxmljs.parseXml(abstractXml,{ noblanks: true }))
    .then(abstractXmlDoc => {
      const abstract = { };
      const abstractTitleTag = '//ArticleTitle';
      const abstractTextTag = '//AbstractText';
      const journalIssue = '//JournalIssue';
      const abstractPubDateTag = '//PubDate';


      abstract.title = abstractXmlDoc.get(abstractTitleTag).text();

      const abstractTextSections = abstractXmlDoc.find(abstractTextTag);

      // we must have at least one item in order to enter this block
      if (abstractTextSections[0]) {
        const abstractHasOneElement = (abstractTextSections.length === 1);
        const abstractHasNoCategory = !(abstractTextSections[0].attr('NlmCategory'));

        if (abstractHasOneElement && abstractHasNoCategory) {
          // if abstractText has one child and node and that node does
          // not have a category, then that node must have the abstract text
          // and abstract is not divided into sections. so we save that text as background
          abstract.background = abstractTextSections[0].text();
        } else {
          let sectionTitle = '';
          _.each(abstractTextSections, section => {
            sectionTitle = _.lowerCase(section.attr('NlmCategory').value());
            abstract[sectionTitle] = section.text();
          });
        }
      }

      const pubDateElement = abstractXmlDoc.get(abstractPubDateTag);
      const pubYear = pubDateElement.get('Year').text();

      try {
        const pubMonth = pubDateElement.get('Month').text();
        // save date as iso string courtesy of moment
        abstract.date = moment(`${pubMonth}/1/${pubYear}`, "MMM-DD-YYYY").toISOString();
      } catch(err) {
        // we most likely dont have a month so default to the jan 1st of the year
        abstract.date = moment(`1/1/${pubYear}`, "MMM-DD-YYYY").toISOString();
      }

      try {
        const journalIssueElement = abstractXmlDoc.get(journalIssue);
        abstract.journalName = journalIssueElement.get('Title').text();
        abstract.journalISOAbbreviation = journalIssueElement.get('ISOAbbreviation').text();
      } catch(err) {
        console.log('could not get journal name');
      }



      abstract.authors = googleScholarEntry.authors;
      abstract.citedCount = googleScholarEntry.citedCount;
      abstract.citedUrl = googleScholarEntry.citedUrl;
      abstract.link = googleScholarEntry.url;
      abstract.source = abstractSource;

      return abstract;
    })
}
const acceptedUrls = [
'ncbi.nlm.nih.gov'
];

module.exports = new Extractor(pubmedExtractor, { acceptedUrls });
