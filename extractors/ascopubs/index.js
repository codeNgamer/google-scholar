const request = require('request-promise').defaults({ jar: true });
const $ = require('cheerio');
const striptags = require('striptags');
const _ = require('lodash');
const fs = require('fs');

const Extractor = require('../extractor');
const abstractSource = 'ASCO';

function extractInfoFromSections (abstractContainer, abstract) {
  const abstractSectionClass = '.NLM_sec.NLM_sec_level_1';
  const sectionHeadingSelector = '.sectionHeading';
  const sectionContentSelector = 'p';
  let sectionHtml = null;

  $(abstractSectionClass, abstractContainer).each(function(i, elem) {
    sectionHtml = $(elem).html();

    // get this section title and then convert to lowercase so we
    // can save in abstract object
    const abstractSectionTitle = _.lowerCase($(sectionHeadingSelector, sectionHtml).text());
    abstract[abstractSectionTitle] = $(sectionContentSelector, sectionHtml).text();
  });;

}

function extractInfoFromAbstractText (abstractContainer, abstract) {
  const abstractTextSectionSelector = 'p';
  const sectionContentHeading = 'b';
  let sectionHtml = null;

  // get abstract body of text
  const abstractBodyText = $(abstractTextSectionSelector, abstractContainer).eq(1).html();

  $(sectionContentHeading, abstractBodyText).each(function(i, elem) {
    sectionHtml = $(elem).html();

    // get this section title and then convert to lowercase so we
    // can save in abstract object
    const abstractSectionTitle = _.lowerCase($(elem).text());
    abstract[abstractSectionTitle] = elem.next.data;
  });;

}

function saveAbstractText(abstractContainer, abstract) {
  const abstractTextSelector = 'p';

  const abstractText = $(abstractTextSelector, abstractContainer).text();

  abstract.background = abstractText;
}

const ascopubsExtractor = function (googleScholarEntry) {
  return request(googleScholarEntry.url)
    .then(html => {
      const abstractContext = '.wrapped';
      const abstractTitleClass = '.chaptertitle';
      const abstractContainerClass = '.abstractSection.abstractInFull';
      const abstract = {};

      const abstractHtmlContainer = $(abstractContainerClass, abstractContext, html).html();

      // extracts information from sections if available and stores in abstract object
      extractInfoFromSections(abstractHtmlContainer, abstract);

      // if abstract object is still empty at this point, it means we have a page with no sections
      // so it must be in the abstract text. let's use the alternate extractor
      if (_.isEmpty(abstract)) extractInfoFromAbstractText(abstractHtmlContainer, abstract);

      // if abstract is still empty at this point, we'll save the whole text blob as
      // the abstract background
      if(_.isEmpty(abstract)) saveAbstractText(abstractHtmlContainer, abstract);

      try {
        abstract.title = $('meta[name="dc.Title" i]','head', html).prop('content');
        abstract.sourceId = $('meta[scheme="doi" i]','head', html).prop('content');
        abstract.publisherId = $('meta[scheme="publisher-id" i]','head', html).prop('content');
        abstract.publisher = $('meta[name="dc.Publisher" i]','head', html).prop('content').trim();
        abstract.date = $('meta[name="dc.Date" i]','head', html).prop('content');
      } catch(err) {
        // just catch the error
        // console.log(err);
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
'ascopubs.org'
];


module.exports = new Extractor(ascopubsExtractor, { acceptedUrls });
