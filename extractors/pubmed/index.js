const request = require('request-promise').defaults({ jar: true });
const parser = require('xml2json');
const $ = require('cheerio');
const _ = require('lodash');
const pubmedEfetch = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed';
const returnMode = '&retmode=xml';

const pubmedExtractor = function (googleScholarEntry) {
  const uriOptions = {
    uri: googleScholarEntry.url,
    resolveWithFullResponse :true,
    simple: true
  };
  return request(googleScholarEntry.url)
    .then(html => {
      console.log(googleScholarEntry.url);
      // get pmid from page so we can get actual article from pubmedEfetch
      // so we dont have to scrape
      const pmid = $('meta[name="citation_pmid" i]','head', html).prop('content');
      return pmid;
    })
  // get article from efetch
    .then(pmid => request(`${pubmedEfetch}&id=${pmid}${returnMode}`))
  // convert abstract xml to json
    .then(abstractXml => parser.toJson(abstractXml, { object: true }))
    .then(abstractObject => {
      const {
        MedlineCitation: medlineCitation,
        PubmedData: pubmedData,
      } = abstractObject.PubmedArticleSet.PubmedArticle;

      console.log('---------');
      console.log(abstractObject);
      console.log('----End-----');

      const abstract = { };
      let abstractCategory = '';
      abstract.title = medlineCitation.Article.ArticleTitle;

      // grab all the categories from the abstract i.e sections like methods, conclusion etc
      _.each(medlineCitation.Article.Abstract.AbstractText, entry => {
        abstractCategory = _.lowerCase(entry.NlmCategory);
        abstract[abstractCategory] = entry['$t'];
      });


      return abstract;
    })
}


module.exports = pubmedExtractor;
