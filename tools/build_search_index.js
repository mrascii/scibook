#!/usr/bin/env node

var fs = require('fs');
var elasticlunr = require('../assets/js/vendor-modified/elasticlunr.js');
// Multi language language support.
require('../assets/js/vendor/lunr.stemmer.support')(elasticlunr);
require('../assets/js/vendor/lunr.multi')(elasticlunr);
require('../assets/js/vendor/lunr.ru')(elasticlunr);
require('../assets/js/vendor-modified/lunr.he')(elasticlunr);

// Note: 'en' is always used by default, language param is an additional
// language (if different from 'en').
function BuildIndex(language, inputJson, outputIndex) {
  console.log('Reading JSON from ' + inputJson);
  var documents = JSON.parse(fs.readFileSync(inputJson));

  var index = elasticlunr(function() {
    // TODO: Share this code with search.html to avoid copy-paste.
    if (language === 'ru')
      this.use(elasticlunr.multiLanguage('en', 'ru'));
    else if (language === 'he')
      this.use(elasticlunr.multiLanguage('en', 'he'));

    // TODO: Reduce length of field names for smaller index size.
    this.setRef('id');
    this.addField('title');
    this.addField('section');
    this.addField('tags');
    this.addField('content');
    this.addField('uri');

    documents.forEach(function(doc) {
      this.addDoc(doc);
    }, this);
  });

  var outputDir = outputIndex.substring(0, outputIndex.lastIndexOf('/'));
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, {recursive: true});

  console.log('Writing generated index to ' + outputIndex);
  // Store generated JSON file in JS format.
  fs.writeFileSync(
      outputIndex,
      'function loadSearchIndex() { var indexDump = ' + JSON.stringify(index) +
          '; return elasticlunr.Index.load(indexDump); }');
}

var args = process.argv;
BuildIndex(args[2] /* lang */, args[3] /* input */, args[4] /* output */)
