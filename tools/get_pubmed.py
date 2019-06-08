#!/usr/local/bin/python3
#####################################
# Retrieve pubmed ids from chapters #
#####################################
import json
import html
from pathlib import Path
import re
import sys
import urllib.parse
import subprocess

TAG_CODENAME = 'I_S_codename'
NBIB_ALL_DIR = Path('nbib.all')
NBIB_DIR = Path('nbib')


def getUrlsFrom(digest):
    digest = html.unescape(digest)
    toReplace = {' ==': '==', ' ]': ']', '/wiki/Гирсутизм': '/wiki/Гирсутизм]',
                 '/wiki/Аланинаминотрансфераза': '/wiki/Аланинаминотрансфераза]',
                 'http: ': 'http:', ' .com/': '.com/', 'nordic. cochrane.org': 'nordic.cochrane.org',
                 'nlm. nih.gov': 'nlm.nih.gov', 'ncbi .nlm': 'ncbi.nlm', 'push -its-': 'push-its-',
                 'fr- j_appl': 'fr-j_appl', '-that -all-': '-that-all-',
                 'PMC340185э': 'PMC340185'}
    for old in toReplace:
        digest = digest.replace(old, toReplace[old])

    # Collect all urls from the digest.
    urls = []
    re.sub(r'\[(.*?)==(.*?[^\[])\]',
           lambda m: urls.append(urllib.parse.unquote(m.group(2))), digest)

    return urls


def parseChapter(ch, lang):
    namespace = ch['namespace']
    codename = ch[TAG_CODENAME] if TAG_CODENAME in ch else "intro"

    intro = getUrlsFrom(ch['intro']) if 'intro' in ch else ""
    summary = getUrlsFrom(ch['summary']) if 'summary' in ch else ""

    urls = set(intro).union(set(summary))
    pubmedids = set()

    for pt in ch['points']:
        if 'digest' not in pt:
            if 'item' not in pt:
                print(f'Missing digest/item in {namespace}_{codename}_{lang}')
            else:
                urls = urls.union(getUrlsFrom(pt['item']))
        else:
            urls = urls.union(getUrlsFrom(pt['digest']))

        if 'link' in pt:
            urls.add(pt.get('link'))
        if 'infoID' in pt:
            pubmedids.add(pt.get('infoID'))

    # Extract pubmed ids
    for url in urls:
        if not url:
            continue
        if '/pubmed/' in url:
            match = re.search(r'/pubmed/(\d+?)(/|$)', url)
            if match:
                pubmedids.add(match.group(1))
            else:
                print(f'No match for {url}')
        elif '/pmc/articles/PMC' in url:
            match = re.search(r'/articles/(PMC\d+?)(/|$)', url)
            if match:
                pubmedids.add(match.group(1))
            else:
                print(f'No match for {url}')

    # Filter out empty values
    pubmedids = sorted(filter(lambda x: x.isdigit()
                              or x.startswith('PMC'), pubmedids))

    def download(file, id):
        if id.startswith('PMC'):
            url = f'https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pmc/?format=medline&id={id[3:]}&download=true'
        else:
            url = f'https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=medline&id={id}&download=true'
        subprocess.call(['wget', '-O', file, url])

    outDir = Path(NBIB_DIR/f'{namespace}_{codename}_{lang}/')
    outDir.mkdir(exist_ok=True, parents=True)
    copiedIds = set()

    # Download all articles from all chapters into one directory.
    for id in pubmedids:
        file = NBIB_ALL_DIR/id
        if not file.exists():
            download(file, id)
        # Write per-chapter files and check for duplicates (PMC <=> Pubmed).
        if id in copiedIds:
            print(f'Already copied {id}')
            continue
        subprocess.call(['cp', file, outDir/id])
        copiedIds.add(id)
        if id.startswith('PMC'):
            match = re.search(r'PMID- (\d+?)\n', file.read_text())
        else:
            match = re.search(r'PMC - (PMC\d+?)\n', file.read_text())
        if match:
            copiedIds.add(match.group(1))


def filterAll():
    copiedIds = set()
    outDir = NBIB_DIR/'all_chapters'
    outDir.mkdir(exist_ok=True, parents=True)

    for file in NBIB_ALL_DIR.iterdir():
        if not file.is_file():
            continue
        id = file.name
        if id in copiedIds:
            print(f'Already copied {id}')
            continue
        subprocess.call(['cp', file, outDir/id])
        copiedIds.add(id)
        if id.startswith('PMC'):
            match = re.search(r'PMID- (\d+?)\n', file.read_text())
        else:
            match = re.search(r'PMC - (PMC\d+?)\n', file.read_text())
        if match:
            copiedIds.add(match.group(1))


def LoadBackup(backupDir):
    """Parse backed up json chapters, where every file has all chapters (json objects) inside."""
    CHAPTERS_JSON = {'chapters.json': 'ru',
                     'chapters_en.json': 'en', 'chapters_he.json': 'he'}
    INTROS_JSON = {'intros.json': 'ru',
                   'intros_en.json': 'en', 'intros_he.json': 'he'}
    chaptersToIgnore = ['5a7dfdf2f76d5b47e4765e69', '5af87684cf1e8c634393b70c',
                        '5a7de996f76d5b2d4c9d77f4', '5bfa7c84cf1e8c6104563079', '5a7de996f76d5b2d4c9d77f4']
    from itertools import chain
    for chapter, lang in chain(CHAPTERS_JSON.items(), INTROS_JSON.items()):
        with open(backupDir / chapter, 'r') as fp:
            for line in fp:
                chapter = json.loads(line)
                # Skip invalid chapters
                if chapter['_id']['$oid'] in chaptersToIgnore:
                    continue
                parseChapter(chapter, lang)


def LoadJsons(jsonsDir):
    """Each article is stored in a separate json file"""
    for jsonFile in jsonPath.glob('**/*.json'):
        jsonFile = str(jsonFile)
        with open(jsonFile, 'r') as fp:
            chapter = json.load(fp)
            lang = jsonFile[len(jsonFile) - len('xx.json')
                                : len(jsonFile) - len('.json')]
            parseChapter(chapter, lang)


#################################################################
if len(sys.argv) < 2:
    print(
        f"Usage: {sys.argv[0]} <path_to_json_collections>")
    exit(1)

jsonPath = Path(sys.argv[1])

try:
    LoadBackup(jsonPath)
    exit(0)
except:
    None

LoadJsons(jsonPath)
filterAll()
