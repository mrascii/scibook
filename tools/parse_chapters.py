#!/usr/bin/env python3
#################################################################################
# Parse scibook.org json DB backup and generate content for static hugo website #
#################################################################################
import json
import html          # For markdownify and unescape
import math
import os
from pathlib import Path
import re            # For markdownify
import sys
import unicodedata   # For normalizeFilename
import urllib.parse  # For normalizeFilename

ENABLE_DUPLICATE_LINKS_CHECK = False

# TODO: Check "is_hidden" json sections

# Double content dir is used for compatibility with existing sci-book navigation.
# For hugo the section `content` is created
DEFAULT_SITE_CONTENT_DIR = os.path.dirname(
    os.path.realpath(__file__)) + '/../content/content/'

TAG_TYPE = 'I_S_type_this'
TAG_CODENAME = 'I_S_codename'

CHAPTERS_ORDER = [
    {'vaccines': [
        'intro',
        'anti-vaxx',
        'physicians',
        'placebo',
        'safety',
        'unvaccinated',
        'aluminium',
        'papilloma',
        'hepatitisB',
        'pertussis',
        'tetanus',
        'diphtheria',
        'measles',
        'mumps',
        'rubella',
        'polio',
        'influenza',
        'hib',
        'pneumococcal',
        'varicella',
        'rotavirus',
        'hepatitisA',
        'meningococcal',
        'tuberculosis',
        'vitaminK',
        'SIDS',
        'mercury',
        'autism']},
    {'antipyretics': [
        'fever',
        'paracetamol',
        'ibuprofen',
        'febrileseizures',
        'alternatives']},
    {'childbirth': ['cordclamping']}
]

TRANSLATIONS = {
    'vaccines': {'en': 'Vaccines', 'ru': 'Прививки', 'he': 'חיסונים '},
    'antipyretics': {'en': 'Antipyretics', 'ru': 'Жаропонижающие', 'he': 'נוגדת חומצה'},
    'childbirth': {'en': 'Childbirth', 'ru': 'Роды', 'he': 'לידה'},
    'source': {'en': 'Source', 'ru': 'Источник', 'he': 'מקור'},
}


def loadTags(objectsJson):
    """Load tags with their translations."""
    allTags = {}
    with open(objectsJson) as fp:
        for line in fp:
            tag = json.loads(line)
            # Fix duplicates
            if tag[TAG_CODENAME] == 'H.influenzae' and tag['I_S_name_en'] == "Staphylococcus Aureus":
                tag[TAG_CODENAME] = "S.aureus"
            # For easier translation later.
            tag['ru'] = tag.pop('I_S_name')
            tag['en'] = tag.pop('I_S_name_en')
            tag['he'] = tag.pop('I_S_name_he')
            allTags[tag[TAG_CODENAME]] = tag
    # Fix missing countries
    allTags['Bulgaria'] = {'en': "Bulgaria",
                           'ru': "Болгария", 'he': "בולגריה", TAG_TYPE: "geo"}
    allTags['Columbia'] = {'en': "Columbia",
                           'ru': "Колумбия", 'he': "קולומביה", TAG_TYPE: "geo"}
    allTags['CzechRepublic'] = {'en': "Czech Republic",
                                'ru': "Чехия", 'he': "הרפובליקה הצ'כית", TAG_TYPE: "geo"}
    allTags['Denmark'] = {'en': "Denmark",
                          'ru': "Дания", 'he': "דנמרק", TAG_TYPE: "geo"}
    allTags['Greece'] = {'en': "Greece",
                         'ru': "Греция", 'he': "יוון", TAG_TYPE: "geo"}
    allTags['Malawi'] = {'en': "Malawi",
                         'ru': "Малави", 'he': "מאלאווי", TAG_TYPE: "geo"}
    allTags['Mexico'] = {'en': "Mexico",
                         'ru': "Мексика", 'he': "מקסיקו", TAG_TYPE: "geo"}
    allTags['Nepal'] = {'en': "Nepal",
                        'ru': "Непал", 'he': "נפאל", TAG_TYPE: "geo"}
    allTags['Nicaragua'] = {'en': "Nicaragua",
                            'ru': "Никарагуа", 'he': "ניקרגואה", TAG_TYPE: "geo"}
    allTags['Philippines'] = {'en': "Philippines",
                              'ru': "Филиппины", 'he': "פיליפינען", TAG_TYPE: "geo"}
    allTags['SouthSudan'] = {'en': "South Sudan",
                             'ru': "Южный Судан", 'he': "דרום סודן", TAG_TYPE: "geo"}
    allTags['Thailand'] = {'en': "Thailand",
                           'ru': "Таиланд", 'he': "תאילנד", TAG_TYPE: "geo"}
    allTags['Uganda'] = {'en': "Uganda",
                         'ru': "Уганда", 'he': "אוגנדה", TAG_TYPE: "geo"}
    allTags['Ukraine'] = {'en': "Ukraine",
                          'ru': "Украина", 'he': "אוקראינה", TAG_TYPE: "geo"}
    allTags['Venezuela'] = {'en': "Venezuela",
                            'ru': "Венесуэла", 'he': "ונצואלה", TAG_TYPE: "geo"}
    allTags['Yemen'] = {'en': "Yemen",
                        'ru': "Йемен", 'he': "תימן", TAG_TYPE: "geo"}

    # Fix missing diseases
    allTags['anemia'] = {'en': "Anemia",
                         'ru': "Анемия", 'he': "אנמיה", TAG_TYPE: "disease"}
    allTags['acrodynia'] = {'en': "Acrodynia",
                            'ru': "Акродиния", 'he': "אקרודיניה", TAG_TYPE: "disease"}
    allTags['AIDS'] = {'en': "AIDS",
                       'ru': "СПИД", 'he': "איידס", TAG_TYPE: "disease"}
    allTags['anorexia'] = {'en': "Anorexia",
                           'ru': "Анорексия", 'he': "אנורקסיה", TAG_TYPE: "disease"}
    allTags["Burkitt's_lymphoma"] = {'en': "Burkitt's lymphoma",
                                     'ru': "Лимфома Бёркитта", 'he': "בורקיט לימפומה", TAG_TYPE: "disease"}
    allTags['celiac'] = {'en': "Coeliac Disease",
                         'ru': "Целиакия", 'he': "מחלת צליאק", TAG_TYPE: "disease"}
    allTags['chronic_fatigue_syndrome'] = {'en': "Chronic Fatigue Syndrome (CFS)",
                                           'ru': "Синдром хронической усталости", 'he': "תסמונת התשישות הכרונית", TAG_TYPE: "disease"}
    allTags['conjunctivitis'] = {'en': "Conjunctivitis",
                                 'ru': "Конъюктивит", 'he': "דלקת הלחמית", TAG_TYPE: "disease"}
    allTags['Crohn'] = {'en': "Crohn's Disease",
                        'ru': "Болезнь Крона", 'he': "מחלת קרוהן", TAG_TYPE: "disease"}
    allTags['demyelination'] = {'en': "Demyelination",
                                'ru': "Демиелинизация", 'he': "מחלת הדמינלינציה", TAG_TYPE: "disease"}
    allTags['glioblastoma'] = {'en': "Glioblastoma",
                               'ru': "глиобластома", 'he': "גליובלסטומה", TAG_TYPE: "disease"}
    allTags['herpes_zoster'] = {'en': "Herpes Zoster (Shingles)",
                                'ru': "Опоясывающий лишай", 'he': "שלבקת חוגרת", TAG_TYPE: "disease"}
    allTags['influenza'] = {'en': "Influenza (The Flu)",
                            'ru': "Грипп", 'he': "גריפע", TAG_TYPE: "disease"}
    allTags['insomnia'] = {'en': "Insomnia",
                           'ru': "Бессонница", 'he': "נדודי שינה", TAG_TYPE: "disease"}
    allTags['intussusception'] = {'en': "Intussusception",
                                  'ru': "Инвагинация кишечника", 'he': "התפשלות מעיים", TAG_TYPE: "disease"}
    allTags['lymphadenopathy'] = {'en': "Lymphadenopathy",
                                  'ru': "Лимфаденопатия", 'he': "לימפדנופתיה", TAG_TYPE: "disease"}
    allTags['malaria'] = {'en': "Malaria",
                          'ru': "Малярия", 'he': "מלריה", TAG_TYPE: "disease"}
    allTags['measles'] = {'en': "Measles",
                          'ru': "Корь", 'he': "חצבת", TAG_TYPE: "disease"}
    allTags['N.meningitidis'] = {'en': "Meningococcus (N.meningitidis)",
                                 'ru': "Менингококк", 'he': "מנינגוקוקוס", TAG_TYPE: "disease"}
    allTags['oncolytic_virus'] = {'en': "Oncolytic Virus",
                                  'ru': "Онколитический вирус", 'he': "וירוס אונקוליטי", TAG_TYPE: "disease"}
    allTags['rubella'] = {'en': "Rubella",
                          'ru': "Краснуха", 'he': "רובלה", TAG_TYPE: "disease"}
    allTags['sepsis'] = {'en': "Sepsis",
                         'ru': "Сепсис", 'he': "אלח דם", TAG_TYPE: "disease"}
    allTags['thrombocytopenia'] = {'en': "Thrombocytopenia",
                                   'ru': "Тромбоцитопения", 'he': "תרומבוציטופניה", TAG_TYPE: "disease"}
    allTags['tic_disorder'] = {'en': "Tic Disorder",
                               'ru': "Нервный тик", 'he': "הפרעת טיק", TAG_TYPE: "disease"}

    # Fix missing conditions
    allTags['antivaxxers'] = {'en': "Anti-vaxxers",
                              'ru': "Антипрививочники", 'he': "אנטי חיסון", TAG_TYPE: "condition"}
    allTags['co-administration'] = {'en': "Co-administration of Vaccines",
                                    'ru': "Комбинирование прививок", 'he': "שילוב החיסונים", TAG_TYPE: "condition"}
    allTags['chord_clamping'] = {'en': "Umbilical Cord Clamping",
                                 'ru': "Зажим пуповины", 'he': "כבל טבורי מהדק", TAG_TYPE: "condition"}
    allTags['developmental_disability'] = {'en': "Developmental Disability",
                                           'ru': "Нарушение развития", 'he': "מוגבלות התפתחותית", TAG_TYPE: "condition"}
    allTags['mortality'] = {'en': "Mortality",
                            'ru': "Смертность", 'he': "תמותה", TAG_TYPE: "condition"}

    allTags['nonspecificeffects'] = {'en': "Non-specific effect",
                                     'ru': "Неспецифический эффект", 'he': "השפעה לא ספציפית", TAG_TYPE: "condition"}
    allTags['nurses'] = {'en': "Nurses",
                         'ru': "Медсёстры", 'he': "אחיות", TAG_TYPE: "condition"}
    allTags['obesity'] = {'en': "Obesity",
                          'ru': "Ожирение", 'he': "השמנה", TAG_TYPE: "condition"}
    allTags['physicians'] = {'en': "Physicians",
                             'ru': "Врачи", 'he': "רופאים", TAG_TYPE: "condition"}
    allTags['shedding'] = {'en': "Vaccine Shedding",
                           'ru': "Заражение от вакцинированных", 'he': "זיהום וירוס חיסון", TAG_TYPE: "condition"}
    allTags['unvaccinated'] = {'en': "Unvaccinated",
                               'ru': "Непривитые", 'he': "ללא חיסונים", TAG_TYPE: "condition"}

    # Fix missing drugs
    allTags['aborted_fetus_cells'] = {'en': "Fetal Tissue in Vaccines",
                                      'ru': "Абортированные клетки", 'he': "רקמת העובר בחיסונים", TAG_TYPE: "drug"}
    allTags['cinnamon'] = {'en': "Cinnamon",
                           'ru': "Корица", 'he': "קינמון", TAG_TYPE: "drug"}
    allTags['cod_lover_oil'] = {'en': "Cod Liver Oil",  # Note the typo 'cod_lover' :)
                                'ru': "Рыбий жир", 'he': "שמן כבד כבד", TAG_TYPE: "drug"}
    allTags['hepB_vaccine'] = {'en': "Hepatitis B Vaccine",
                               'ru': "Вакцина против гепатита B", 'he': "חיסון הפטיטיס B", TAG_TYPE: "drug"}
    allTags['HPV_vaccine'] = {'en': "Human Papilloma Virus (HPV) vaccine",
                              'ru': "Вакцина против вируса папилломы", 'he': "חיסון לנגיף הפפילומה האנושי", TAG_TYPE: "drug"}
    allTags['ibuprofen'] = {'en': "Ibuprofen",
                            'ru': "Ибупрофен", 'he': "איבופרופן", TAG_TYPE: "drug"}
    allTags['IL-6'] = {'en': "Interleukin 6 (IL-6)",
                       'ru': "Интерлейкин 6 (IL-6)", 'he': "אינטרליוקין 6 (IL-6)", TAG_TYPE: "drug"}
    allTags['influeza_vaccine'] = {'en': "Influenza Vaccine",
                                   'ru': "Вакцина против гриппа", 'he': "חיסון נגד שפעת", TAG_TYPE: "drug"}
    allTags['IPV'] = {'en': "Inactivated Polio Vaccine (IPV)",
                      'ru': "Инактивированная полиомиелитная вакцина", 'he': "חיסון פוליו לא פעיל", TAG_TYPE: "drug"}
    allTags['OPV'] = {'en': "Oral Polio Vaccine (OPV)",
                      'ru': "Оральная полиомиелитная вакцина", 'he': "חיסון אוראלי לחולי פוליו", TAG_TYPE: "drug"}
    allTags['pentavalent_vaccine'] = {'en': "Pentavalent Vaccine",
                                      'ru': "Пентавалентная вакцина", 'he': "חיסון פונטוואלנטי", TAG_TYPE: "drug"}
    allTags['ultrasound'] = {'en': "Ultrasound",
                             'ru': "Ультразвук", 'he': "אולטרסאונד", TAG_TYPE: "drug"}

    # Fix typos for already present terms
    for typo, correction in {
            'аутизм': 'autism',
            'anaphylactic_shock': 'anaphylaxis',
            'breastfeeding': 'breast_feeding',
            'DTap-Hib': 'DTaP-Hib',
            'DTaP/Hib': 'DTaP-Hib',
            'hepatitisBvaccine': 'hepB_vaccine',
            'HPVvaccine': 'HPV_vaccine',
            'NewZealand': 'New Zealand',
            'Guinea_Бissau': 'Guinea-Bissau',
            'PapuaNewGuinea': 'Papua_New_Guinea',
            'RepublicofCongo': 'Republic_of_Congo',
            'SouthKorea': 'South_Korea',
            'SouthAfrica': 'South_Africa',
            'eczema': 'eczemae',
            'type1_diabetes': 'type_1_diabetes',
            'otitis_media': 'AOM',
            'otitismdeia': 'AOM',
            'otitis': 'AOM',
            'aluminium': 'aluminum',
            'Lymphoblastic_leukemia': 'lymphoblastic_leukemia',
            'multiplesclerosis': 'multiple_sclerosis',
            'WHO': 'ЦРЩ',
            'DTaP': 'DTaP_vaccine',
            'DTP': 'DTP_vaccine',
            'oncolytic': 'oncolytic_virus',
            'molecular_mimicry': 'Molecular_mimicry',
            'unvaxxed': 'unvaccinated',
            'vitaminA': 'vitamin_A',
            'VitaminC': 'vitamin_C',
            'vitaminC': 'vitamin_C',
            'vitaminD': 'vitamin_D',
            "Finland]": 'Finland',
            "u'Belgium'": 'Belgium',
            "u'Bangladesh']": 'Bangladesh',
            "u'France']": "France",
            "u'Finland']": 'Finland',
            "u'Israel'": 'Israel',
            "u'Russia']": 'Russia',
            "u'US']": 'US',
            "u'UK']": 'UK',
            "u'UK'": 'UK',
            "u'Germany'": 'Germany',
            "[u'Sweden'": 'Sweden',
            '[Sweden': 'Sweden',
            "[u'US'": 'US',
            "[u'Yemen'": 'Yemen',
            "[u'Japan'": 'Japan',
            "[u'Spain'": 'Spain',
            '["US"': 'US',
            '"Israel"]': 'Israel',
            'Isral': 'Israel',
            '"Denmark"': 'Denmark',
    }.items():
        allTags[typo] = allTags[correction]
    return allTags


def normalizeFilename(title):
    title = str(title)
    title = unicodedata.normalize('NFKC', title).strip()
    title = title.translate(
        dict.fromkeys(map(ord, '"&\':;<=>?®'), None))
    title = title.replace('/', ', ')
    title = title.replace('  ', ' ')
    if len(title) > 240:
        title = ' '.join(title.split(' ', 12)[:-1])  # Take max 16 words
    return title


def trim(stringOrNone):
    if isinstance(stringOrNone, str):
        return stringOrNone.strip(' \r\n\t')
    return stringOrNone


def markdownify(digest, lang):
    digest = html.unescape(digest)
    digest = markdownify.boldRegex.sub(r'\1**\2**\3', digest)
    digest = markdownify.italicRegex.sub(r'\1*\2*\3', digest)
    # Remove accidental spaces before ']' and '==' in urls
    digest = digest.replace(' ==', '==')
    digest = digest.replace(' ]', ']')
    # Fix some missing closing bracers in original links
    toReplace = {'/wiki/Гирсутизм': '/wiki/Гирсутизм]',
                 '/wiki/Аланинаминотрансфераза': '/wiki/Аланинаминотрансфераза]'}
    for old in toReplace:
        digest = digest.replace(old, toReplace[old])

    # Convert urls to Markdown and remove percent encoding for urls
    digest = markdownify.urlRegex.sub(
        lambda m: f'[{m.group(1)}]({urllib.parse.unquote(m.group(2))})', digest)

    def ul(items, nested=False):
        # Process embedded ol list and it's items
        if not nested:
            items = markdownify.olRegex.sub(
                lambda m: ol(m.group(1), nested=True), items)
        replacement = "    - " if nested else "- "
        items = items.replace('<li>', replacement)
        if not nested:
            items += '\n'
        return items

    def ol(items, nested=False):
        if 'liRegex' not in ol.__dict__:
            ol.liRegex = re.compile(r'(<li>)')
        # Process embedded ul list and it's items
        if not nested:
            # TODO: Insert \n?
            items = markdownify.ulRegex.sub(
                lambda m: ul(m.group(1), nested=True), items)
        ol.count = 1

        def counter(str):
            str = f"    {ol.count}. " if nested else f"{ol.count}. "
            ol.count = ol.count + 1
            return str

        items = ol.liRegex.sub(lambda m: counter(m.group(1)), items)
        if not nested:
            items += '\n'
        return items

    digest = markdownify.olRegex.sub(
        lambda m: ol(m.group(1)), digest)
    digest = markdownify.ulRegex.sub(
        lambda m: ul(m.group(1)), digest)
    # For lists, insert additional \n only for the first li element
    # digest = digest.replace('<br>- ', '\n\n- ', 1)
    toReplace = {'\r\n': '\n', '<br>': '\n', '...': '…', '  ': ' ', ' \n': '\n', '\t': ' ',
                 'http: ': 'http:', ' .com/': '.com/', 'nordic. cochrane.org': 'nordic.cochrane.org',
                 'nlm. nih.gov': 'nlm.nih.gov', 'ncbi .nlm': 'ncbi.nlm', 'push -its-': 'push-its-',
                 'fr- j_appl': 'fr-j_appl', '-that -all-': '-that-all-',
                 '[]=Hepatitis B&': '[]=Hepatitis%20B&'}
    if lang == 'ru':
        toReplace[' - '] = ' — '
    for old in toReplace:
        digest = digest.replace(old, toReplace[old])
    # Convert numeric lists with 1), 2) to 1. 2.
    #digest = markdownify.olnumOneRegex.sub(r'\1\n\n1. ', digest)
    #digest = markdownify.olnumRegex.sub(r'\1. ', digest)
    return digest


# Cache regex expressions for markdownify function above
markdownify.urlRegex = re.compile(r'\[(.*?)==(.*?[^\[])\]')
markdownify.boldRegex = re.compile(r'<b>( *)(.*?)( *)</b>')
markdownify.italicRegex = re.compile(r'<i>( *)(.*?)( *)</i>')
markdownify.ulRegex = re.compile(r'<ul>(.*?)</ul>')
markdownify.olRegex = re.compile(r'<ol>(.*?)</ol>')
#markdownify.olnumOneRegex = re.compile(r'([^\n])\n1\) ')
#markdownify.olnumRegex = re.compile(r'^([0-9]+)\) ', re.MULTILINE)

markdownUrlRegex = re.compile(r'\[.*?\]\(([^ ]*)\)')


def groupTagsByType(tags, lang):
    grouped = {}
    for tag in tags:  # Works only if tags is not empty.
        group = allTags[tag][TAG_TYPE]
        if group in grouped:
            grouped[group].append(allTags[tag][lang])
        else:
            grouped[group] = [allTags[tag][lang]]
    return grouped


def localizeCountries(countries, lang):
    localized = []
    # Convert strings to lists.
    if isinstance(countries, str):
        localized = [s.strip() for s in countries.split(',')]
    else:
        for country in countries:
            localized.append(allTags[country][lang])
    return localized


def parseReferences(ch, lang):
    """Make markdown from references"""
    if not 'ref_header' in ch:
        return ""
    header = ch['ref_header']
    intro = ch['ref_intro']
    md = f"### {header}\n\n"
    md += f"{intro}\n\n"

    for ref in ch['refs']:
        refDigest = markdownify(
            ref['ref_digest'], lang) if 'ref_digest' in ref else ""
        refTitle = ref['ref_title']
        refType = ref['ref_type']
        md += f"#### {refTitle}\n\n"
        if refDigest:
            md += f"{refDigest}\n\n"
        i = 1
        for item in ref['ref_pool']:
            link = item['link']
            title = item['title']
            type = item['linktype'] if 'linktype' in item else ""
            author = item['author'] if 'author' in item else ""
            digest = markdownify(
                item['digest'], lang) if 'digest' in item else ""
            md += f"{i}. [{title}]({link})"
            if author:
                md += f", {author}"
            md += "\n"
            if digest:
                md += f"{digest}\n"
            i += 1
        md += "\n"
    return md


def imageFrom(dict, lang):
    markdown = '\n{{< figure src="' + dict['info_img'] + '"'
    if 'info_imgSource' in dict:
        markdown += ' attr="' + \
            TRANSLATIONS['source'][lang] + '" attrlink="' + \
            dict['info_imgSource'] + '"'
    markdown += ' >}}\n'
    return markdown


def parseChapter(ch, lang, siteContentDir):
    """Generates markdown files from parsed chapter"""
    # Trim all values
    for key, value in ch.items():
        ch[key] = trim(value)
    analyst = ch['analyst']
    namespace = ch['namespace']
    chapterTitle = ch['title'] if 'title' in ch else ch['subject']
    codename = ch[TAG_CODENAME] if TAG_CODENAME in ch else "intro"
    date = ch['date']['$date']
    epigraphText = markdownify(
        trim(ch['epigraph'].get('text')).replace('<br>', ' '), lang)
    epigraphSource = ch['epigraph'].get('source')
    intro = markdownify(ch['intro'], lang) if 'intro' in ch else ""
    summary = markdownify(ch['summary'], lang) if 'summary' in ch else ""
    lastmod = ch['editdate']['$date'] if 'editdate' in ch else ""
    # Missing translated key is a case for translated intros
    translated = ch['translated'] == 1.0 if 'translated' in ch else 1.0
    interpreter = ch.get('interpreter')
    interpreter_link = ch.get('interpreter_link')

    summary = parseReferences(ch, lang) + summary

    outDir = siteContentDir / namespace / codename
    if not outDir.exists():
        outDir.mkdir(parents=True)

    # Generate section files to list subsections
    for i, chapters in enumerate(CHAPTERS_ORDER):
        if next(iter(chapters.keys())) == namespace:
            orderedChapters = chapters[namespace]
            namespaceWeight = (i + 1) * 10
            break
    with open(siteContentDir / namespace / f'_index.{lang}.md', 'w') as fp:
        fp.write(
            f'---\ntitle: {TRANSLATIONS[namespace][lang]}\nweight: {namespaceWeight}\n---\n')

    # Write chapter index
    index = f"---\n"
    index += f"title: '{chapterTitle}'\n"
    weight = orderedChapters.index(codename)
    weight = (weight + 1) * 10     # human order, and 10 to allow insertions
    index += f"weight: {weight}\n"
    index += f"date: {date}\n"
    index += f"analyst: {analyst}\n"
    if epigraphText:
        index += 'epigraph:\n'
        index += f'  text: "{epigraphText}"\n'
        if epigraphSource:
            index += f'  source: "{epigraphSource}"\n'
    if interpreter:
        index += f"interpreter: {interpreter}\n"
        if interpreter_link:
            index += f"interpreter_link: {interpreter_link}\n"
    index += "---\n"
    index += summary
    with open(outDir / f"_index.{lang}.md", 'w') as fp:
        fp.write(index)
    # Use hugo headless bundle as a workaround to support a second piece of content: intro
    if intro:
        if not (outDir / 'introduction').exists():
            (outDir / 'introduction').mkdir()
        index = "---\nheadless: true\n---\n"
        index += intro
        with open(outDir / f"introduction/index.{lang}.md", 'w') as fp:
            fp.write(index)

    # Sanity check for duplicate links in a chapter
    chapterLinks = dict()

    for pt in ch['points']:
        if 'digest' not in pt:
            if 'item' not in pt:
                print(
                    f'Missing digest/item in {chapterTitle} num:{num} lang:{lang}')
                digest = ''
            else:
                digest = markdownify(pt['item'], lang)
        else:
            digest = markdownify(pt['digest'], lang)

        num = pt['num']

        # Check for duplicate links
        if ENABLE_DUPLICATE_LINKS_CHECK:
            links = markdownUrlRegex.findall(digest)
            if links:
                for link in links:
                    if link in chapterLinks:
                        print(
                            f'Duplicate link {link} in {chapterTitle} num:{chapterLinks[link]} and num:{num} lang:{lang}')
                    else:
                        chapterLinks[link] = num

        header = pt.get('header')
        # Handle "inserted" pages with non-rounded values (only one insertion is supported)
        insertedChar = '-' if num != math.floor(
            num) else ''
        tags = groupTagsByType(pt['I_S_codenames'],
                               lang) if 'I_S_codenames' in pt else {}
        countries = localizeCountries(
            pt['info_geo'], lang) if 'info_geo' in pt else []
        title = pt['title'].rstrip('.') if 'title' in pt else ""
        type = pt.get('info_type')       # article/cdc/mass media/VAERS
        year = pt.get('info_date')       # 2005
        authors = pt.get('info_authors')
        journal = pt.get('info_place')
        link = pt.get('link')            # url to pubmed
        pubmedId = pt.get('infoID')

        mdFileDir = f"{num:03.0f}{insertedChar} {normalizeFilename(title)}" if title else f"{num:03.0f}"
        mdFile = f"index.{lang}.md"
        txt = "---\n"
        if title:
            txt += 'title: "{}"\n'.format(
                html.unescape(title.replace('"', '\\"')))
        # Date changes default file name sorting order in hugo.
        #txt += f"date: {date}\n"
        # if lastmod:
        #    txt += f"lastmod: {lastmod}\n"
        # Duplicate analyst for each article
        txt += f"analyst: {analyst}\n"
        # txt += f"weight: {num * 10}\n"  # Multiply for easier future ordering
        if header:
            txt += f"header: '{html.unescape(header)}'\n"

        if type or authors or year or journal or link or pubmedId:
            txt += "article:\n"
            if type:
                txt += f"  type: {type}\n"
            if authors:
                txt += f"  authors: {html.unescape(authors)}\n"
            if year:
                txt += f"  year: {year}\n"
            if journal:
                txt += f"  journal: {html.unescape(journal)}\n"
            if link:
                txt += f"  link: {link}\n"
            if pubmedId:
                txt += f"  pubmed: {pubmedId}\n"
        for group, keywords in tags.items():
            txt += f"{group}s:\n"  # Pluralize group by adding 's' at the end
            for keyword in keywords:
                txt += f"- {html.unescape(keyword)}\n"
        if countries:
            txt += "countries:\n"
            for country in countries:
                txt += f"- {html.unescape(country)}\n"
        txt += "---\n\n"

        # Generate article body
        txt += digest
        txt += '\n'

        if 'sources_pool' in pt:
            for src in sorted(pt['sources_pool'], key=lambda v: v['num']):
                txt += "\n"
                if 'info_authors' in src:
                    txt += f"{src['info_authors']} ({src['info_date']}). "
                txt += f"[{src['title'].rstrip('.')}]({src['link']})."
                if 'info_place' in src:
                    txt += f" *{src['info_place']}*"
                txt += "\n"

        # Image at the end of the article if it's present
        if 'info_img' in pt:
            txt += imageFrom(pt, lang)

        # Image pool if it's present is also displayed at the end
        if 'img_pool' in pt:
            for img in sorted(pt['img_pool'], key=lambda v: v['num']):
                txt += imageFrom(img, lang)

        finalDir = outDir / mdFileDir
        if not finalDir.exists():
            finalDir.mkdir()
        with open(finalDir / mdFile, 'w') as fp:
            fp.write(txt)


def LoadBackup(backupDir, contentDir):
    """Parse backed up json chapters, where every file has all chapters (json objects) inside."""
    CHAPTERS_JSON = {'chapters.json': 'ru',
                     'chapters_en.json': 'en', 'chapters_he.json': 'he'}
    INTROS_JSON = {'intros.json': 'ru',
                   'intros_en.json': 'en', 'intros_he.json': 'he'}
    chaptersToIgnore = ['5a7dfdf2f76d5b47e4765e69', '5af87684cf1e8c634393b70c', '5a7de996f76d5b2d4c9d77f4',
                        '5bfa7c84cf1e8c6104563079', '5a7de996f76d5b2d4c9d77f4']
    from itertools import chain
    for chapter, lang in chain(CHAPTERS_JSON.items(), INTROS_JSON.items()):
        with open(backupDir / chapter, 'r') as fp:
            for line in fp:
                chapter = json.loads(line)
                # Skip invalid chapters
                if chapter['_id']['$oid'] in chaptersToIgnore:
                    continue
                parseChapter(chapter, lang, contentDir)


def LoadJsons(jsonsDir, contentDir):
    """Each article is stored in a separate json file"""
    for jsonFile in jsonPath.glob('**/*.json'):
        jsonFile = str(jsonFile)
        with open(jsonFile, 'r') as fp:
            chapter = json.load(fp)
            lang = jsonFile[len(jsonFile) - len('xx.json')
                                : len(jsonFile) - len('.json')]
            parseChapter(chapter, lang, contentDir)


#################################################################
if len(sys.argv) < 2:
    print(
        f"Usage: {sys.argv[0]} <path_to_json_collections> [path_to_tags_file] [path_to_out_content_dir]")
    exit(1)

jsonPath = Path(sys.argv[1])

tagsDir = Path(sys.argv[2]) if len(sys.argv) > 2 else jsonPath / 'objects.json'
allTags = loadTags(tagsDir)

contentDir = Path(sys.argv[3]) if len(
    sys.argv) > 3 else Path(DEFAULT_SITE_CONTENT_DIR)

if not contentDir.exists():
    contentDir.mkdir(parents=True)

try:
    LoadBackup(jsonPath, contentDir)
except:
    LoadJsons(jsonPath, contentDir)
