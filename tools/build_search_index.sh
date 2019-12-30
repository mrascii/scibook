#!/bin/bash

set -e -u -x

SCRIPT_DIR=$(dirname "$BASH_SOURCE")
SEARCH_INDEX_ROOT="search-index"
LANGUAGES=(en ru he)

# Prints MD5 sum of a file passed as a first argument.
# TODO: Support Windows platforms if necessary.
md5_of_file () {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    local SUM=$(md5 -q "$1")
  else
    local SUM=($(md5sum "$1")) # Double bracers to cut off second argument.
  fi
  echo "$SUM"
}

# Generate json with site data which is needed to build a search index.
# Note: `search-index` directory is used for output instead of `public`
pushd "$SCRIPT_DIR/.."
  hugo --environment searchindex -d "$SEARCH_INDEX_ROOT"
popd

# TODO: Add hash to file names
for lang in "${LANGUAGES[@]}"
do
  input="$SCRIPT_DIR/../$SEARCH_INDEX_ROOT/$lang/search.json"
  output="${input}.js"
  node "$SCRIPT_DIR/build_search_index.js" "$lang" "$input" "$output"
  MD5_SUM=$(md5_of_file "$output")
  hashed_output="$SCRIPT_DIR/../static/$lang/search-$MD5_SUM.json.js"
  # Remove previous versions (if any)
  rm -f "$SCRIPT_DIR/../static/$lang/search-*.json.js"* || true
  mv "$output" "$hashed_output"
  # Pre-compress search index for the web server. Compressed version takes less time to download by clients.
  gzip -f -k -9 "$hashed_output"
done
