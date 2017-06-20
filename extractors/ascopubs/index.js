const request = require('request-promise').defaults({ jar: true });
const $ = require('cheerio');
const striptags = require('striptags');
const _ = require('lodash');

const context = '.wrapped';
const abstractContainerClass = '.abstractSection.abstractInFull';
const abstractSectionClass = '.NLM_sec.NLM_sec_level_1';


function extractInfoFromSections (abstractContainer, abstract) {
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

const ascopubsExtractor = function (googleScholarEntry) {
  return request(googleScholarEntry.url)
    .then(html => {
      const abstract = {};

      const abstractHtmlContainer = $(abstractContainerClass, context, html).html();

      // extracts information from sections if available and stores in abstract object
      extractInfoFromSections(abstractHtmlContainer, abstract);

      // if abstract object is still empty at this point, it means we have a page with no sections
      // so it must be in the abstract text. let's use the alternate extractor
      if (_.isEmpty(abstract)) extractInfoFromAbstractText(abstractHtmlContainer, abstract);

      return abstract;
    })
}


module.exports = ascopubsExtractor;
