function onTranslateToSelected(el) {
  // No language element.
  if (!el.value) return;

  console.log(el.value);

  el.disabled = true;
  document.body.style.cursor = 'wait';

  var dir = el.getAttribute('data-dir');
  var basename = encodeURIComponent(el.getAttribute('data-basename'));
  var fromLanguage = document.documentElement.getAttribute('lang');
  var toLanguage = el.value;

  var sourceUrl = 'https://github.com/mrascii/scibook/'.replace(
      'https://github.com', 'https://raw.githubusercontent.com');
  sourceUrl = '{0}master/content/{1}{2}.{3}.md'.format(
      sourceUrl, dir, basename, fromLanguage);

  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.readyState == 4) {
      if (request.status == 200) {
        var markdownContent = encodeURIComponent(request.responseText);

        // Generate URL to create a new page translation.
        var filename =
            encodeURIComponent('{0}.{1}.md'.format(basename, toLanguage));
        var newFileUrl =
            'https://github.com/mrascii/scibook/new/master/content/{0}/{1}?filename={1}&value={2}'
                .format(
                    dir.substr(0, dir.length - 1), filename, markdownContent);

        window.open(newFileUrl, '_blank');
      } else {
        // TODO: Visually display errors.
        console.log('Error getting ' + sourceUrl);
      }
      // Restore cursor and element.
      el.disabled = false;
      el.selectedIndex = 0;
      document.body.style.cursor = 'default';
    }
  };
  request.open('GET', sourceUrl, true);
  request.send(null);

  console.log(sourceUrl);
}
