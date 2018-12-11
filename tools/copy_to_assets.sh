#!/bin/bash
# Updates hugo assets from node_modules

set -e -u -x

SCRIPT_DIR=`dirname "$BASH_SOURCE"`
IN_DIR="$SCRIPT_DIR/../node_modules"
OUT_CSS="$SCRIPT_DIR/../assets/css"
OUT_JS="$SCRIPT_DIR/../assets/js/vendor"
JS=(
  jquery/dist/jquery.js
  popper.js/dist/popper.js
  bootstrap/dist/js/bootstrap.js
  lunr/lunr.js
  lunr-languages/lunr.stemmer.support.js
  lunr-languages/lunr.multi.js
  lunr-languages/lunr.ru.js
)
CSS=( bootstrap/dist/css/bootstrap.css )

for js in "${JS[@]}"; do
  FILE=`basename $js`
  cp "$IN_DIR/$js" "$OUT_JS/$FILE"
done

for css in "${CSS[@]}"; do
  FILE=`basename $css`
  cp "$IN_DIR/$css" "$OUT_CSS/$FILE"
done

# Generate fresh rtl version for bootstrap
node_modules/.bin/rtlcss assets/css/bootstrap.css assets/css/bootstrap-rtl.css
