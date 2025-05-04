# Welcome to SciBook

# Requirements

- hugo (uses postcss)
- npm i


# How to update the website

1. Pull fresh w4a-backup repo
2. `./tools/parse_chapters.py ../w4a-backup/chapters ../w4a-backup/objects.json `
3. `tools/get_pubmed.py ../w4a-backup/chapters`

## TODO

- Fix hardcoded lists in md filed which are not divided by newlines
- Tune search and results displaying
- Enable site indexing by robots
- Get rid of bootstrap (use rtlcss for right-to-left css versions)
- Pre-compress everything to gz
