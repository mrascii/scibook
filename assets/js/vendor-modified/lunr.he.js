/*!
 * Lunr languages, `Hebrew` language
 * https://github.com/MihaiValentin/lunr-languages
 *
 * Copyright 2014, Mihai Valentin
 * http://www.mozilla.org/MPL/
 */
/*!
 * based on
 * Snowball JavaScript Library v0.3
 * http://code.google.com/p/urim/
 * http://snowball.tartarus.org/
 *
 * Copyright 2010, Oleg Mazko
 * http://www.mozilla.org/MPL/
 */

/**
 * export the module via AMD, CommonJS or as a browser global
 * Export code from https://github.com/umdjs/umd/blob/master/returnExports.js
 */
;
(function(root, factory) {
if (typeof define === 'function' && define.amd) {
  // AMD. Register as an anonymous module.
  define(factory)
} else if (typeof exports === 'object') {
  /**
   * Node. Does not work with strict CommonJS, but
   * only CommonJS-like environments that support module.exports,
   * like Node.
   */
  module.exports = factory()
} else {
  // Browser globals (root is window)
  factory()(root.lunr);
}
}(this, function() {
/**
 * Just return a value to define the module export.
 * This example returns an object, but the module
 * can return a function as the exported value.
 */
return function(lunr) {
  /* throw error if lunr is not yet included */
  if ('undefined' === typeof lunr) {
    throw new Error(
        'Lunr is not present. Please include / require Lunr before this script.');
  }

  /* throw error if lunr stemmer support is not yet included */
  if ('undefined' === typeof lunr.stemmerSupport) {
    throw new Error(
        'Lunr stemmer support is not present. Please include / require Lunr stemmer support before this script.');
  }

  /* register specific locale function */
  lunr.he = function() {
    this.pipeline.reset();
    this.pipeline.add(lunr.he.trimmer, lunr.he.stopWordFilter, lunr.he.stemmer);

    // for lunr version 2
    // this is necessary so that every searched word is also stemmed before
    // in lunr <= 1 this is not needed, as it is done using the normal pipeline
    if (this.searchPipeline) {
      this.searchPipeline.reset();
      this.searchPipeline.add(lunr.he.stemmer)
    }
  };

  /* lunr trimmer function */
  lunr.he.wordCharacters = '\u0590-\u05FF\uFB1D-\uFB4F';
  lunr.he.trimmer = lunr.trimmerSupport.generateTrimmer(lunr.he.wordCharacters);
  lunr.Pipeline.registerFunction(lunr.he.trimmer, 'trimmer-he');

  /* lunr stemmer function */
  lunr.he.stemmer = (function() {
    /* TODO hebrew stemmer  */
    return function(word) {
      return word;
    }
  })();
  lunr.Pipeline.registerFunction(lunr.he.stemmer, 'stemmer-he');
  // TODO: Hebrew stopwords.
  lunr.he.stopWordFilter = lunr.generateStopWordFilter(''.split(' '));

  lunr.Pipeline.registerFunction(lunr.he.stopWordFilter, 'stopWordFilter-he');
};
}))
