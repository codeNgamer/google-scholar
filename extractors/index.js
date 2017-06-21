const ascoExtractor = require('./ascopubs');
const aacrExtractor = require('./aacr');
const pubmedExtractor = require('./pubmed');
const extractors = {
  ascoExtractor,
  aacrExtractor,
  pubmedExtractor,
};

module.exports = extractors;
