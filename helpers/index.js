const _ = require('lodash');
const extractors = require('../extractors');

function findExtractor(googleScholarEntry) {
  let foundUrlMatch = false;

  // find an extractor that contains the googleScholarEntry url as an accepted url
  return _.find(extractors, extractor => {
    foundUrlMatch = _.find(extractor.getAcceptedUrls(), (url) => {
      if (googleScholarEntry.url) {
        return googleScholarEntry.url.includes(url);
      }
      return false
    });

    return foundUrlMatch;
  })
}

const helpers = {
  findExtractor,
};

module.exports = helpers;
