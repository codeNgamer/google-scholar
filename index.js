const scholar = (function () {
  const request = require('request');
  const cheerio = require('cheerio');
  const striptags = require('striptags');
  const _ = require('lodash');

  const extractors = require('./extractors');
  const { findExtractor } = require('./helpers');

  const GOOGLE_SCHOLAR_URL = 'https://scholar.google.com/scholar?hl=en&q=';
  const GOOGLE_SCHOLAR_URL_PREFIX = 'https://scholar.google.com';

  const ELLIPSIS_HTML_ENTITY = '&#x2026;';
  const ET_AL_NAME = 'et al.';
  const CITATION_COUNT_PREFIX = 'Cited by ';
  const RELATED_ARTICLES_PREFIX = 'Related articles';

  const STATUS_CODE_FOR_RATE_LIMIT = 503;
  const STATUS_MESSAGE_FOR_RATE_LIMIT = 'Service Unavailable';
  const STATUS_MESSAGE_BODY = 'This page appears when Google automatically detects requests coming from your computer network which appear to be in violation of the <a href="//www.google.com/policies/terms/">Terms of Service</a>. The block will expire shortly after those requests stop.';

  // regex with thanks to http://stackoverflow.com/a/5917250/1449799
  const RESULT_COUNT_RE = /\W*((\d+|\d{1,3}(,\d{3})*)(\.\d+)?) results/;

  function scholarResultsCallback (resolve, reject) {
    return function (error, response, html) {
      if (error) {
        reject(error)
      } else if (response.statusCode !== 200) {
        if (response.statusCode == STATUS_CODE_FOR_RATE_LIMIT && response.statusMessage == STATUS_MESSAGE_FOR_RATE_LIMIT && response.body.indexOf(STATUS_MESSAGE_BODY) > -1) {
          reject('you are being rate-limited by google. you have made too many requests too quickly. see: https://support.google.com/websearch/answer/86640')
        } else {
          reject('expected statusCode 200 on http response, but got: ' + response.statusCode)
        }
      } else {
        let $ = cheerio.load(html)

        let results = $('.gs_r')
        let resultCount = 0
        let nextUrl = ''
        let prevUrl = ''
        if ($('.gs_ico_nav_next').parent().attr('href')) {
          nextUrl = GOOGLE_SCHOLAR_URL_PREFIX + $('.gs_ico_nav_next').parent().attr('href')
        }
        if ($('.gs_ico_nav_previous').parent().attr('href')) {
          prevUrl = GOOGLE_SCHOLAR_URL_PREFIX + $('.gs_ico_nav_previous').parent().attr('href')
        }

        let processedResults = []
        results.each((i, r) => {
          $(r).find('.gs_ri h3 span').remove()
          let title = $(r).find('.gs_ri h3').text().trim()
          let url = $(r).find('.gs_ri h3 a').attr('href')
          let authorNamesHTMLString = $(r).find('.gs_ri .gs_a').html()
          let etAl = false
          let etAlBegin = false
          let authors = []
          let description = $(r).find('.gs_ri .gs_rs').text()
          let footerLinks = $(r).find('.gs_ri .gs_fl a')
          let citedCount = 0
          let citedUrl = ''
          let relatedUrl = ''
          let pdfUrl =  $($(r).find('.gs_ggsd a')[0]).attr('href')

          if ($(footerLinks[0]).text().indexOf(CITATION_COUNT_PREFIX) >= 0) {
            citedCount = $(footerLinks[0]).text().substr(CITATION_COUNT_PREFIX.length)
          }
          if ($(footerLinks[0]).attr &&
            $(footerLinks[0]).attr('href') &&
            $(footerLinks[0]).attr('href').length > 0) {
            citedUrl = GOOGLE_SCHOLAR_URL_PREFIX + $(footerLinks[0]).attr('href')
          }
          if (footerLinks &&
            footerLinks.length &&
            footerLinks.length > 0) {
            if ($(footerLinks[0]).text &&
              $(footerLinks[0]).text().indexOf(CITATION_COUNT_PREFIX) >= 0) {
              citedCount = $(footerLinks[0]).text().substr(CITATION_COUNT_PREFIX.length)
            }

            if ($(footerLinks[1]).text &&
              $(footerLinks[1]).text().indexOf(RELATED_ARTICLES_PREFIX) >= 0 &&
              $(footerLinks[1]).attr &&
              $(footerLinks[1]).attr('href') &&
              $(footerLinks[1]).attr('href').length > 0) {
              relatedUrl = GOOGLE_SCHOLAR_URL_PREFIX + $(footerLinks[1]).attr('href')
            }
          }
          if (authorNamesHTMLString) {
            let cleanString = authorNamesHTMLString.substr(0, authorNamesHTMLString.indexOf(' - '))
            if (cleanString.substr(cleanString.length - ELLIPSIS_HTML_ENTITY.length) === ELLIPSIS_HTML_ENTITY) {
              etAl = true
              cleanString = cleanString.substr(0, cleanString.length - ELLIPSIS_HTML_ENTITY.length)
            }
            if (cleanString.substr(0, ELLIPSIS_HTML_ENTITY.length) === ELLIPSIS_HTML_ENTITY) {
              etAlBegin = true
              cleanString = cleanString.substr(ELLIPSIS_HTML_ENTITY.length + 2)
            }
            let htmlAuthorNames = cleanString.split(', ')
            if (etAl) {
              htmlAuthorNames.push(ET_AL_NAME)
            }
            if (etAlBegin) {
              htmlAuthorNames.unshift(ET_AL_NAME)
            }
            authors = htmlAuthorNames.map(name => {
              let tmp = cheerio.load(name)
              let authorObj = {
                name: '',
                url: ''
              }
              if (tmp('a').length === 0) {
                authorObj.name = striptags(name)
              } else {
                authorObj.name = tmp('a').text()
                authorObj.url = GOOGLE_SCHOLAR_URL_PREFIX + tmp('a').attr('href')
              }
              return authorObj
            })
          }

          processedResults.push({
            title: title,
            url: url,
            authors: authors,
            description: description,
            citedCount: citedCount,
            citedUrl: citedUrl,
            relatedUrl: relatedUrl,
            pdf: pdfUrl
          })
        })

        let resultsCountString = $('#gs_ab_md').text()
        if (resultsCountString && resultsCountString.trim().length > 0) {
          let matches = RESULT_COUNT_RE.exec(resultsCountString)
          if (matches && matches.length > 0) {
            resultCount = parseInt(matches[1].replace(/,/g, ''))
          } else {
            resultCount = processedResults.length
          }
        } else {
          resultCount = processedResults.length
        }

        resolve({
          results: processedResults,
          count: resultCount,
          nextUrl: nextUrl,
          prevUrl: prevUrl,
          next: function () {
            let p = new Promise(function (resolve, reject) {
              request(nextUrl, scholarResultsCallback(resolve, reject))
            })
            return p
          },
          previous: function () {
            let p = new Promise(function (resolve, reject) {
              request(prevUrl, scholarResultsCallback(resolve, reject))
            })
            return p
          }
        })
      }
    }
  }

  function formatQuery(userQuery) {
    let site = '';

    if (_.isArray(userQuery.site)) {
      site = _.reduce(userQuery.site, function(siteString, site, index) {
        siteString = `${siteString} site:${site}`;
        if (userQuery.site[index + 1]) return `${siteString} OR `;

        return siteString;
      }, site);
    } else {
      site = userQuery.site ? `site:${userQuery.site}` : '';
    }
    const exact = userQuery.exact ? `&as_epq=${userQuery.exact}` : '';
    const contains = userQuery.contains ? `&as_oq=${userQuery.contains}` : '';
    const without = userQuery.without ? `&as_eq=${userQuery.without}` : '';
    const authors = userQuery.authors ? `&as_sauthors=${userQuery.author}` : '';
    const published = userQuery.published ? `&as_publication=${userQuery.published}` : '';
    const minYear = userQuery.minYear ? `&as_ylo=${userQuery.minYear}` : '';
    const maxYear = (userQuery.minYear && userQuery.maxYear) ? `&as_yhi=${userQuery.maxYear}` : '';

    return `${userQuery.query} ${site}${exact}${contains}${without}${authors}${minYear}${maxYear}` ;
  }

  function search (query) {
    const p = new Promise(function (resolve, reject) {
      const formattedQuery = _.isString(query) ? query : formatQuery(query);
      const url = encodeURI(GOOGLE_SCHOLAR_URL + formattedQuery);

      request(url, scholarResultsCallback(resolve, reject));
    })

    let pageCount = 1;

    return p
      .then(resultsObj => {
        // if query is not an object then no need to check for maxPages, return resultsObj
        // if there's no nextUrl, return resultsObj as well
        if (!_.isObject(query)) return resultsObj;
        if (!resultsObj.nextUrl) return resultsObj;
        if (!_.has(query, 'maxPages')) return resultsObj;

        if (query.maxPages) {
          const delayBetweenRequests = query.requestDelay || 500;

          return new Promise(function(resolve, reject) {
            function getNextPage(res, pageCount) {
              // update results with new results;
              resultsObj.results = _.union(resultsObj.results, res.results);
              resultsObj.next = res.next;
              resultsObj.previous = res.previous;
              resultsObj.nextUrl = res.nextUrl;
              resultsObj.prevUrl = res.prevUrl;

              // if there's no nextUrl break out
              if (!res.nextUrl) return resolve(resultsObj);
              // if we've met maxPages count then break out
              if (pageCount >= query.maxPages) return resolve(resultsObj);

              res.next()
                .then(newResults => {
                  _.delay(() => getNextPage(newResults, pageCount + 1), delayBetweenRequests);
                });
            }

            resultsObj.next()
              .then(res => {
                _.delay(() => getNextPage(res, pageCount + 1), delayBetweenRequests);
              })
          });
        }
      })
  }

  function searchAndExtract(query) {
    let resultOptions = {};
    let pageCount = 1; // default pageCount is 1 since we already start with a search

    return search(query)
      .then(resultsObj => {
        let extractor = null;

        if (resultsObj === undefined) return resultsObj;

        resultOptions = _.pick(resultsObj, [ 'count', 'nextUrl', 'prevUrl', 'next', 'previous' ]);
        return Promise.all(resultsObj.results.map(function(result) {
          extractor = findExtractor(result);

          if (!extractor) {
            console.log(`Could not find extractor for ${result.url}!, skipping..`);
            return {};
          }

          return extractor(result);
        }))
      })
      .then(results =>  {
        return _.merge({ results }, resultOptions )
      })
  }

  return {
    search,
    searchAndExtract,
    extractors,
  }
})()

module.exports = scholar
