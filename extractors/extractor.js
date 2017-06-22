const _ = require('lodash');

const extractorModel = function Extractor(extractor, options) {
  let extractorUrls = [];

  const {
    acceptedUrls
  } = options;

  function setAcceptedUrls() {
    extractorUrls = acceptedUrls;
  }

  extractor.getAcceptedUrls = function getAcceptedUrls() {
    return extractorUrls
  }

  if (!acceptedUrls.length) throw new Error('You must set at least one accepted url for this extractor');
  setAcceptedUrls();

  return extractor;
};

// Extractor.prototype.getAcceptedUrls = function() { return this.getAcceptedUrls(); }

module.exports = extractorModel;
