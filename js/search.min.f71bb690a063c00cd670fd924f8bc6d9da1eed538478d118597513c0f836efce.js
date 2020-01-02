(function(){/*!
* elasticlunr.js
* Copyright (C) 2017 Oliver Nightingale
* Copyright (C) 2017 Wei Song
*/var elasticlunr=function(config){var idx=new elasticlunr.Index;idx.pipeline.add(elasticlunr.trimmer,elasticlunr.stopWordFilter,elasticlunr.stemmer);if(config)config.call(idx,idx);return idx;};elasticlunr.version="0.9.5";lunr=elasticlunr;/*!
* elasticlunr.utils
* Copyright (C) 2017 Oliver Nightingale
* Copyright (C) 2017 Wei Song
*/elasticlunr.utils={};lunr.generateStopWordFilter=function(stopWords){var words=stopWords.reduce(function(memo,stopWord){memo[stopWord]=stopWord
return memo},{})
return function(token){if(token&&words[token.toString()]!==token.toString())return token}}
elasticlunr.utils.warn=(function(global){return function(message){if(global.console&&console.warn){console.warn(message);}};})(this);elasticlunr.utils.toString=function(obj){if(obj===void 0||obj===null){return "";}
return obj.toString();};/*!
* elasticlunr.EventEmitter
* Copyright (C) 2017 Oliver Nightingale
* Copyright (C) 2017 Wei Song
*/elasticlunr.EventEmitter=function(){this.events={};};elasticlunr.EventEmitter.prototype.addListener=function(){var args=Array.prototype.slice.call(arguments),fn=args.pop(),names=args;if(typeof fn!=="function")throw new TypeError("last argument must be a function");names.forEach(function(name){if(!this.hasHandler(name))this.events[name]=[];this.events[name].push(fn);},this);};elasticlunr.EventEmitter.prototype.removeListener=function(name,fn){if(!this.hasHandler(name))return;var fnIndex=this.events[name].indexOf(fn);if(fnIndex===-1)return;this.events[name].splice(fnIndex,1);if(this.events[name].length==0)delete this.events[name];};elasticlunr.EventEmitter.prototype.emit=function(name){if(!this.hasHandler(name))return;var args=Array.prototype.slice.call(arguments,1);this.events[name].forEach(function(fn){fn.apply(undefined,args);},this);};elasticlunr.EventEmitter.prototype.hasHandler=function(name){return name in this.events;};/*!
* elasticlunr.tokenizer
* Copyright (C) 2017 Oliver Nightingale
* Copyright (C) 2017 Wei Song
*/elasticlunr.tokenizer=function(str){if(!arguments.length||str===null||str===undefined)return[];if(Array.isArray(str)){var arr=str.filter(function(token){if(token===null||token===undefined){return false;}
return true;});arr=arr.map(function(t){return elasticlunr.utils.toString(t).toLowerCase();});var out=[];arr.forEach(function(item){var tokens=item.split(elasticlunr.tokenizer.seperator);out=out.concat(tokens);},this);return out;}
return str.toString().trim().toLowerCase().split(elasticlunr.tokenizer.seperator);};elasticlunr.tokenizer.defaultSeperator=/[\s\-]+/;elasticlunr.tokenizer.seperator=elasticlunr.tokenizer.defaultSeperator;elasticlunr.tokenizer.setSeperator=function(sep){if(sep!==null&&sep!==undefined&&typeof(sep)==='object'){elasticlunr.tokenizer.seperator=sep;}}
elasticlunr.tokenizer.resetSeperator=function(){elasticlunr.tokenizer.seperator=elasticlunr.tokenizer.defaultSeperator;}
elasticlunr.tokenizer.getSeperator=function(){return elasticlunr.tokenizer.seperator;}/*!
* elasticlunr.Pipeline
* Copyright (C) 2017 Oliver Nightingale
* Copyright (C) 2017 Wei Song
*/
elasticlunr.Pipeline=function(){this._queue=[];};elasticlunr.Pipeline.registeredFunctions={};elasticlunr.Pipeline.registerFunction=function(fn,label){if(label in elasticlunr.Pipeline.registeredFunctions){elasticlunr.utils.warn('Overwriting existing registered function: '+label);}
fn.label=label;elasticlunr.Pipeline.registeredFunctions[label]=fn;};elasticlunr.Pipeline.getRegisteredFunction=function(label){if((label in elasticlunr.Pipeline.registeredFunctions)!==true){return null;}
return elasticlunr.Pipeline.registeredFunctions[label];};elasticlunr.Pipeline.warnIfFunctionNotRegistered=function(fn){var isRegistered=fn.label&&(fn.label in this.registeredFunctions);if(!isRegistered){elasticlunr.utils.warn('Function is not registered with pipeline. This may cause problems when serialising the index.\n',fn);}};elasticlunr.Pipeline.load=function(serialised){var pipeline=new elasticlunr.Pipeline;serialised.forEach(function(fnName){var fn=elasticlunr.Pipeline.getRegisteredFunction(fnName);if(fn){pipeline.add(fn);}else{throw new Error('Cannot load un-registered function: '+fnName);}});return pipeline;};elasticlunr.Pipeline.prototype.add=function(){var fns=Array.prototype.slice.call(arguments);fns.forEach(function(fn){elasticlunr.Pipeline.warnIfFunctionNotRegistered(fn);this._queue.push(fn);},this);};elasticlunr.Pipeline.prototype.after=function(existingFn,newFn){elasticlunr.Pipeline.warnIfFunctionNotRegistered(newFn);var pos=this._queue.indexOf(existingFn);if(pos===-1){throw new Error('Cannot find existingFn');}
this._queue.splice(pos+1,0,newFn);};elasticlunr.Pipeline.prototype.before=function(existingFn,newFn){elasticlunr.Pipeline.warnIfFunctionNotRegistered(newFn);var pos=this._queue.indexOf(existingFn);if(pos===-1){throw new Error('Cannot find existingFn');}
this._queue.splice(pos,0,newFn);};elasticlunr.Pipeline.prototype.remove=function(fn){var pos=this._queue.indexOf(fn);if(pos===-1){return;}
this._queue.splice(pos,1);};elasticlunr.Pipeline.prototype.run=function(tokens){var out=[],tokenLength=tokens.length,pipelineLength=this._queue.length;for(var i=0;i<tokenLength;i++){var token=tokens[i];for(var j=0;j<pipelineLength;j++){token=this._queue[j](token,i,tokens);if(token===void 0||token===null)break;};if(token!==void 0&&token!==null)out.push(token);};return out;};elasticlunr.Pipeline.prototype.reset=function(){this._queue=[];};elasticlunr.Pipeline.prototype.get=function(){return this._queue;};elasticlunr.Pipeline.prototype.toJSON=function(){return this._queue.map(function(fn){elasticlunr.Pipeline.warnIfFunctionNotRegistered(fn);return fn.label;});};/*!
* elasticlunr.Index
* Copyright (C) 2017 Oliver Nightingale
* Copyright (C) 2017 Wei Song
*/elasticlunr.Index=function(){this._fields=[];this._ref='id';this.pipeline=new elasticlunr.Pipeline;this.documentStore=new elasticlunr.DocumentStore;this.index={};this.eventEmitter=new elasticlunr.EventEmitter;this._idfCache={};this.on('add','remove','update',(function(){this._idfCache={};}).bind(this));};elasticlunr.Index.prototype.on=function(){var args=Array.prototype.slice.call(arguments);return this.eventEmitter.addListener.apply(this.eventEmitter,args);};elasticlunr.Index.prototype.off=function(name,fn){return this.eventEmitter.removeListener(name,fn);};elasticlunr.Index.load=function(serialisedData){if(serialisedData.version!==elasticlunr.version){elasticlunr.utils.warn('version mismatch: current '
+elasticlunr.version+' importing '+serialisedData.version);}
var idx=new this;idx._fields=serialisedData.fields;idx._ref=serialisedData.ref;idx.documentStore=elasticlunr.DocumentStore.load(serialisedData.documentStore);idx.pipeline=elasticlunr.Pipeline.load(serialisedData.pipeline);idx.index={};for(var field in serialisedData.index){idx.index[field]=elasticlunr.InvertedIndex.load(serialisedData.index[field]);}
return idx;};elasticlunr.Index.prototype.addField=function(fieldName){this._fields.push(fieldName);this.index[fieldName]=new elasticlunr.InvertedIndex;return this;};elasticlunr.Index.prototype.setRef=function(refName){this._ref=refName;return this;};elasticlunr.Index.prototype.saveDocument=function(save){this.documentStore=new elasticlunr.DocumentStore(save);return this;};elasticlunr.Index.prototype.addDoc=function(doc,emitEvent){if(!doc)return;var emitEvent=emitEvent===undefined?true:emitEvent;var docRef=doc[this._ref];this.documentStore.addDoc(docRef,doc);this._fields.forEach(function(field){var fieldTokens=this.pipeline.run(elasticlunr.tokenizer(doc[field]));this.documentStore.addFieldLength(docRef,field,fieldTokens.length);var tokenCount={};fieldTokens.forEach(function(token){if(token in tokenCount)tokenCount[token]+=1;else tokenCount[token]=1;},this);for(var token in tokenCount){var termFrequency=tokenCount[token];termFrequency=Math.sqrt(termFrequency);this.index[field].addToken(token,{ref:docRef,tf:termFrequency});}},this);if(emitEvent)this.eventEmitter.emit('add',doc,this);};elasticlunr.Index.prototype.removeDocByRef=function(docRef,emitEvent){if(!docRef)return;if(this.documentStore.isDocStored()===false){return;}
if(!this.documentStore.hasDoc(docRef))return;var doc=this.documentStore.getDoc(docRef);this.removeDoc(doc,false);};elasticlunr.Index.prototype.removeDoc=function(doc,emitEvent){if(!doc)return;var emitEvent=emitEvent===undefined?true:emitEvent;var docRef=doc[this._ref];if(!this.documentStore.hasDoc(docRef))return;this.documentStore.removeDoc(docRef);this._fields.forEach(function(field){var fieldTokens=this.pipeline.run(elasticlunr.tokenizer(doc[field]));fieldTokens.forEach(function(token){this.index[field].removeToken(token,docRef);},this);},this);if(emitEvent)this.eventEmitter.emit('remove',doc,this);};elasticlunr.Index.prototype.updateDoc=function(doc,emitEvent){var emitEvent=emitEvent===undefined?true:emitEvent;this.removeDocByRef(doc[this._ref],false);this.addDoc(doc,false);if(emitEvent)this.eventEmitter.emit('update',doc,this);};elasticlunr.Index.prototype.idf=function(term,field){var cacheKey="@"+field+'/'+term;if(Object.prototype.hasOwnProperty.call(this._idfCache,cacheKey))return this._idfCache[cacheKey];var df=this.index[field].getDocFreq(term);var idf=1+Math.log(this.documentStore.length/(df+1));this._idfCache[cacheKey]=idf;return idf;};elasticlunr.Index.prototype.getFields=function(){return this._fields.slice();};elasticlunr.Index.prototype.search=function(query,userConfig){if(!query)return[];if(typeof query==='string'){query={any:query};}else{query=JSON.parse(JSON.stringify(query));}
var configStr=null;if(userConfig!=null){configStr=JSON.stringify(userConfig);}
var config=new elasticlunr.Configuration(configStr,this.getFields()).get();var queryTokens={};var queryFields=Object.keys(query);for(var i=0;i<queryFields.length;i++){var key=queryFields[i];queryTokens[key]=this.pipeline.run(elasticlunr.tokenizer(query[key]));}
var queryResults={};for(var field in config){var tokens=queryTokens[field]||queryTokens.any;if(!tokens){continue;}
var fieldSearchResults=this.fieldSearch(tokens,field,config);var fieldBoost=config[field].boost;for(var docRef in fieldSearchResults){fieldSearchResults[docRef]=fieldSearchResults[docRef]*fieldBoost;}
for(var docRef in fieldSearchResults){if(docRef in queryResults){queryResults[docRef]+=fieldSearchResults[docRef];}else{queryResults[docRef]=fieldSearchResults[docRef];}}}
var results=[];var result;for(var docRef in queryResults){result={ref:docRef,score:queryResults[docRef]};if(this.documentStore.hasDoc(docRef)){result.doc=this.documentStore.getDoc(docRef);}
results.push(result);}
results.sort(function(a,b){return b.score-a.score;});return{results:results,tokens:tokens};};elasticlunr.Index.prototype.fieldSearch=function(queryTokens,fieldName,config){var booleanType=config[fieldName].bool;var expand=config[fieldName].expand;var boost=config[fieldName].boost;var scores=null;var docTokens={};if(boost===0){return;}
queryTokens.forEach(function(token){var tokens=[token];if(expand==true){tokens=this.index[fieldName].expandToken(token);}
var queryTokenScores={};tokens.forEach(function(key){var docs=this.index[fieldName].getDocs(key);var idf=this.idf(key,fieldName);if(scores&&booleanType=='AND'){var filteredDocs={};for(var docRef in scores){if(docRef in docs){filteredDocs[docRef]=docs[docRef];}}
docs=filteredDocs;}
if(key==token){this.fieldSearchStats(docTokens,key,docs);}
for(var docRef in docs){var tf=this.index[fieldName].getTermFrequency(key,docRef);var fieldLength=this.documentStore.getFieldLength(docRef,fieldName);var fieldLengthNorm=1;if(fieldLength!=0){fieldLengthNorm=1/Math.sqrt(fieldLength);}
var penality=1;if(key!=token){penality=(1-(key.length-token.length)/key.length)*0.15;}
var score=tf*idf*fieldLengthNorm*penality;if(docRef in queryTokenScores){queryTokenScores[docRef]+=score;}else{queryTokenScores[docRef]=score;}}},this);scores=this.mergeScores(scores,queryTokenScores,booleanType);},this);scores=this.coordNorm(scores,docTokens,queryTokens.length);return scores;};elasticlunr.Index.prototype.mergeScores=function(accumScores,scores,op){if(!accumScores){return scores;}
if(op=='AND'){var intersection={};for(var docRef in scores){if(docRef in accumScores){intersection[docRef]=accumScores[docRef]+scores[docRef];}}
return intersection;}else{for(var docRef in scores){if(docRef in accumScores){accumScores[docRef]+=scores[docRef];}else{accumScores[docRef]=scores[docRef];}}
return accumScores;}};elasticlunr.Index.prototype.fieldSearchStats=function(docTokens,token,docs){for(var doc in docs){if(doc in docTokens){docTokens[doc].push(token);}else{docTokens[doc]=[token];}}};elasticlunr.Index.prototype.coordNorm=function(scores,docTokens,n){for(var doc in scores){if(!(doc in docTokens))continue;var tokens=docTokens[doc].length;scores[doc]=scores[doc]*tokens/n;}
return scores;};elasticlunr.Index.prototype.toJSON=function(){var indexJson={};this._fields.forEach(function(field){indexJson[field]=this.index[field].toJSON();},this);return{version:elasticlunr.version,fields:this._fields,ref:this._ref,documentStore:this.documentStore.toJSON(),index:indexJson,pipeline:this.pipeline.toJSON()};};elasticlunr.Index.prototype.use=function(plugin){var args=Array.prototype.slice.call(arguments,1);args.unshift(this);plugin.apply(this,args);};/*!
* elasticlunr.DocumentStore
* Copyright (C) 2017 Wei Song
*/elasticlunr.DocumentStore=function(save){if(save===null||save===undefined){this._save=true;}else{this._save=save;}
this.docs={};this.docInfo={};this.length=0;};elasticlunr.DocumentStore.load=function(serialisedData){var store=new this;store.length=serialisedData.length;store.docs=serialisedData.docs;store.docInfo=serialisedData.docInfo;store._save=serialisedData.save;return store;};elasticlunr.DocumentStore.prototype.isDocStored=function(){return this._save;};elasticlunr.DocumentStore.prototype.addDoc=function(docRef,doc){if(!this.hasDoc(docRef))this.length++;if(this._save===true){this.docs[docRef]=clone(doc);}else{this.docs[docRef]=null;}};elasticlunr.DocumentStore.prototype.getDoc=function(docRef){if(this.hasDoc(docRef)===false)return null;return this.docs[docRef];};elasticlunr.DocumentStore.prototype.hasDoc=function(docRef){return docRef in this.docs;};elasticlunr.DocumentStore.prototype.removeDoc=function(docRef){if(!this.hasDoc(docRef))return;delete this.docs[docRef];delete this.docInfo[docRef];this.length--;};elasticlunr.DocumentStore.prototype.addFieldLength=function(docRef,fieldName,length){if(docRef===null||docRef===undefined)return;if(this.hasDoc(docRef)==false)return;if(!this.docInfo[docRef])this.docInfo[docRef]={};this.docInfo[docRef][fieldName]=length;};elasticlunr.DocumentStore.prototype.updateFieldLength=function(docRef,fieldName,length){if(docRef===null||docRef===undefined)return;if(this.hasDoc(docRef)==false)return;this.addFieldLength(docRef,fieldName,length);};elasticlunr.DocumentStore.prototype.getFieldLength=function(docRef,fieldName){if(docRef===null||docRef===undefined)return 0;if(!(docRef in this.docs))return 0;if(!(fieldName in this.docInfo[docRef]))return 0;return this.docInfo[docRef][fieldName];};elasticlunr.DocumentStore.prototype.toJSON=function(){return{docs:this.docs,docInfo:this.docInfo,length:this.length,save:this._save};};function clone(obj){if(null===obj||"object"!==typeof obj)return obj;var copy=obj.constructor();for(var attr in obj){if(obj.hasOwnProperty(attr))copy[attr]=obj[attr];}
return copy;}/*!
* elasticlunr.stemmer
* Copyright (C) 2017 Oliver Nightingale
* Copyright (C) 2017 Wei Song
* Includes code from - http://tartarus.org/~martin/PorterStemmer/js.txt
*/
elasticlunr.stemmer=(function(){var step2list={"ational":"ate","tional":"tion","enci":"ence","anci":"ance","izer":"ize","bli":"ble","alli":"al","entli":"ent","eli":"e","ousli":"ous","ization":"ize","ation":"ate","ator":"ate","alism":"al","iveness":"ive","fulness":"ful","ousness":"ous","aliti":"al","iviti":"ive","biliti":"ble","logi":"log"},step3list={"icate":"ic","ative":"","alize":"al","iciti":"ic","ical":"ic","ful":"","ness":""},c="[^aeiou]",v="[aeiouy]",C=c+"[^aeiouy]*",V=v+"[aeiou]*",mgr0="^("+C+")?"+V+C,meq1="^("+C+")?"+V+C+"("+V+")?$",mgr1="^("+C+")?"+V+C+V+C,s_v="^("+C+")?"+v;var re_mgr0=new RegExp(mgr0);var re_mgr1=new RegExp(mgr1);var re_meq1=new RegExp(meq1);var re_s_v=new RegExp(s_v);var re_1a=/^(.+?)(ss|i)es$/;var re2_1a=/^(.+?)([^s])s$/;var re_1b=/^(.+?)eed$/;var re2_1b=/^(.+?)(ed|ing)$/;var re_1b_2=/.$/;var re2_1b_2=/(at|bl|iz)$/;var re3_1b_2=new RegExp("([^aeiouylsz])\\1$");var re4_1b_2=new RegExp("^"+C+v+"[^aeiouwxy]$");var re_1c=/^(.+?[^aeiou])y$/;var re_2=/^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;var re_3=/^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;var re_4=/^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;var re2_4=/^(.+?)(s|t)(ion)$/;var re_5=/^(.+?)e$/;var re_5_1=/ll$/;var re3_5=new RegExp("^"+C+v+"[^aeiouwxy]$");var porterStemmer=function porterStemmer(w){var stem,suffix,firstch,re,re2,re3,re4;if(w.length<3){return w;}
firstch=w.substr(0,1);if(firstch=="y"){w=firstch.toUpperCase()+w.substr(1);}
re=re_1a
re2=re2_1a;if(re.test(w)){w=w.replace(re,"$1$2");}
else if(re2.test(w)){w=w.replace(re2,"$1$2");}
re=re_1b;re2=re2_1b;if(re.test(w)){var fp=re.exec(w);re=re_mgr0;if(re.test(fp[1])){re=re_1b_2;w=w.replace(re,"");}}else if(re2.test(w)){var fp=re2.exec(w);stem=fp[1];re2=re_s_v;if(re2.test(stem)){w=stem;re2=re2_1b_2;re3=re3_1b_2;re4=re4_1b_2;if(re2.test(w)){w=w+"e";}
else if(re3.test(w)){re=re_1b_2;w=w.replace(re,"");}
else if(re4.test(w)){w=w+"e";}}}
re=re_1c;if(re.test(w)){var fp=re.exec(w);stem=fp[1];w=stem+"i";}
re=re_2;if(re.test(w)){var fp=re.exec(w);stem=fp[1];suffix=fp[2];re=re_mgr0;if(re.test(stem)){w=stem+step2list[suffix];}}
re=re_3;if(re.test(w)){var fp=re.exec(w);stem=fp[1];suffix=fp[2];re=re_mgr0;if(re.test(stem)){w=stem+step3list[suffix];}}
re=re_4;re2=re2_4;if(re.test(w)){var fp=re.exec(w);stem=fp[1];re=re_mgr1;if(re.test(stem)){w=stem;}}else if(re2.test(w)){var fp=re2.exec(w);stem=fp[1]+fp[2];re2=re_mgr1;if(re2.test(stem)){w=stem;}}
re=re_5;if(re.test(w)){var fp=re.exec(w);stem=fp[1];re=re_mgr1;re2=re_meq1;re3=re3_5;if(re.test(stem)||(re2.test(stem)&&!(re3.test(stem)))){w=stem;}}
re=re_5_1;re2=re_mgr1;if(re.test(w)&&re2.test(w)){re=re_1b_2;w=w.replace(re,"");}
if(firstch=="y"){w=firstch.toLowerCase()+w.substr(1);}
return w;};return porterStemmer;})();elasticlunr.Pipeline.registerFunction(elasticlunr.stemmer,'stemmer');/*!
* elasticlunr.stopWordFilter
* Copyright (C) 2017 Oliver Nightingale
* Copyright (C) 2017 Wei Song
*/elasticlunr.stopWordFilter=function(token){if(token&&elasticlunr.stopWordFilter.stopWords[token]!==true){return token;}};elasticlunr.clearStopWords=function(){elasticlunr.stopWordFilter.stopWords={};};elasticlunr.addStopWords=function(words){if(words==null||Array.isArray(words)===false)return;words.forEach(function(word){elasticlunr.stopWordFilter.stopWords[word]=true;},this);};elasticlunr.resetStopWords=function(){elasticlunr.stopWordFilter.stopWords=elasticlunr.defaultStopWords;};elasticlunr.defaultStopWords={"":true,"a":true,"able":true,"about":true,"across":true,"after":true,"all":true,"almost":true,"also":true,"am":true,"among":true,"an":true,"and":true,"any":true,"are":true,"as":true,"at":true,"be":true,"because":true,"been":true,"but":true,"by":true,"can":true,"cannot":true,"could":true,"dear":true,"did":true,"do":true,"does":true,"either":true,"else":true,"ever":true,"every":true,"for":true,"from":true,"get":true,"got":true,"had":true,"has":true,"have":true,"he":true,"her":true,"hers":true,"him":true,"his":true,"how":true,"however":true,"i":true,"if":true,"in":true,"into":true,"is":true,"it":true,"its":true,"just":true,"least":true,"let":true,"like":true,"likely":true,"may":true,"me":true,"might":true,"most":true,"must":true,"my":true,"neither":true,"no":true,"nor":true,"not":true,"of":true,"off":true,"often":true,"on":true,"only":true,"or":true,"other":true,"our":true,"own":true,"rather":true,"said":true,"say":true,"says":true,"she":true,"should":true,"since":true,"so":true,"some":true,"than":true,"that":true,"the":true,"their":true,"them":true,"then":true,"there":true,"these":true,"they":true,"this":true,"tis":true,"to":true,"too":true,"twas":true,"us":true,"wants":true,"was":true,"we":true,"were":true,"what":true,"when":true,"where":true,"which":true,"while":true,"who":true,"whom":true,"why":true,"will":true,"with":true,"would":true,"yet":true,"you":true,"your":true};elasticlunr.stopWordFilter.stopWords=elasticlunr.defaultStopWords;elasticlunr.Pipeline.registerFunction(elasticlunr.stopWordFilter,'stopWordFilter');/*!
* elasticlunr.trimmer
* Copyright (C) 2017 Oliver Nightingale
* Copyright (C) 2017 Wei Song
*/elasticlunr.trimmer=function(token){if(token===null||token===undefined){throw new Error('token should not be undefined');}
return token.replace(/^\W+/,'').replace(/\W+$/,'');};elasticlunr.Pipeline.registerFunction(elasticlunr.trimmer,'trimmer');/*!
* elasticlunr.InvertedIndex
* Copyright (C) 2017 Wei Song
* Includes code from - http://tartarus.org/~martin/PorterStemmer/js.txt
*/elasticlunr.InvertedIndex=function(){this.root={docs:{},df:0};};elasticlunr.InvertedIndex.load=function(serialisedData){var idx=new this;idx.root=serialisedData.root;return idx;};elasticlunr.InvertedIndex.prototype.addToken=function(token,tokenInfo,root){var root=root||this.root,idx=0;while(idx<=token.length-1){var key=token[idx];if(!(key in root))root[key]={docs:{},df:0};idx+=1;root=root[key];}
var docRef=tokenInfo.ref;if(!root.docs[docRef]){root.docs[docRef]={tf:tokenInfo.tf};root.df+=1;}else{root.docs[docRef]={tf:tokenInfo.tf};}};elasticlunr.InvertedIndex.prototype.hasToken=function(token){if(!token)return false;var node=this.root;for(var i=0;i<token.length;i++){if(!node[token[i]])return false;node=node[token[i]];}
return true;};elasticlunr.InvertedIndex.prototype.getNode=function(token){if(!token)return null;var node=this.root;for(var i=0;i<token.length;i++){if(!node[token[i]])return null;node=node[token[i]];}
return node;};elasticlunr.InvertedIndex.prototype.getDocs=function(token){var node=this.getNode(token);if(node==null){return{};}
return node.docs;};elasticlunr.InvertedIndex.prototype.getTermFrequency=function(token,docRef){var node=this.getNode(token);if(node==null){return 0;}
if(!(docRef in node.docs)){return 0;}
return node.docs[docRef].tf;};elasticlunr.InvertedIndex.prototype.getDocFreq=function(token){var node=this.getNode(token);if(node==null){return 0;}
return node.df;};elasticlunr.InvertedIndex.prototype.removeToken=function(token,ref){if(!token)return;var node=this.getNode(token);if(node==null)return;if(ref in node.docs){delete node.docs[ref];node.df-=1;}};elasticlunr.InvertedIndex.prototype.expandToken=function(token,memo,root){if(token==null||token=='')return[];var memo=memo||[];if(root==void 0){root=this.getNode(token);if(root==null)return memo;}
if(root.df>0)memo.push(token);for(var key in root){if(key==='docs')continue;if(key==='df')continue;this.expandToken(token+key,memo,root[key]);}
return memo;};elasticlunr.InvertedIndex.prototype.toJSON=function(){return{root:this.root};};/*!
* elasticlunr.Configuration
* Copyright (C) 2017 Wei Song
*/elasticlunr.Configuration=function(config,fields){var config=config||'';if(fields==undefined||fields==null){throw new Error('fields should not be null');}
this.config={};var userConfig;try{userConfig=JSON.parse(config);this.buildUserConfig(userConfig,fields);}catch(error){elasticlunr.utils.warn('user configuration parse failed, will use default configuration');this.buildDefaultConfig(fields);}};elasticlunr.Configuration.prototype.buildDefaultConfig=function(fields){this.reset();fields.forEach(function(field){this.config[field]={boost:1,bool:"OR",expand:false};},this);};elasticlunr.Configuration.prototype.buildUserConfig=function(config,fields){var global_bool="OR";var global_expand=false;this.reset();if('bool'in config){global_bool=config['bool']||global_bool;}
if('expand'in config){global_expand=config['expand']||global_expand;}
if('fields'in config){for(var field in config['fields']){if(fields.indexOf(field)>-1){var field_config=config['fields'][field];var field_expand=global_expand;if(field_config.expand!=undefined){field_expand=field_config.expand;}
this.config[field]={boost:(field_config.boost||field_config.boost===0)?field_config.boost:1,bool:field_config.bool||global_bool,expand:field_expand};}else{elasticlunr.utils.warn('field name in user configuration not found in index instance fields');}}}else{this.addAllFields2UserConfig(global_bool,global_expand,fields);}};elasticlunr.Configuration.prototype.addAllFields2UserConfig=function(bool,expand,fields){fields.forEach(function(field){this.config[field]={boost:1,bool:bool,expand:expand};},this);};elasticlunr.Configuration.prototype.get=function(){return this.config;};elasticlunr.Configuration.prototype.reset=function(){this.config={};};/*!
* lunr.SortedSet
* Copyright (C) 2017 Oliver Nightingale
*/lunr.SortedSet=function(){this.length=0
this.elements=[]}
lunr.SortedSet.load=function(serialisedData){var set=new this
set.elements=serialisedData
set.length=serialisedData.length
return set}
lunr.SortedSet.prototype.add=function(){var i,element
for(i=0;i<arguments.length;i++){element=arguments[i]
if(~this.indexOf(element))continue
this.elements.splice(this.locationFor(element),0,element)}
this.length=this.elements.length}
lunr.SortedSet.prototype.toArray=function(){return this.elements.slice()}
lunr.SortedSet.prototype.map=function(fn,ctx){return this.elements.map(fn,ctx)}
lunr.SortedSet.prototype.forEach=function(fn,ctx){return this.elements.forEach(fn,ctx)}
lunr.SortedSet.prototype.indexOf=function(elem){var start=0,end=this.elements.length,sectionLength=end-start,pivot=start+Math.floor(sectionLength/2),pivotElem=this.elements[pivot]
while(sectionLength>1){if(pivotElem===elem)return pivot
if(pivotElem<elem)start=pivot
if(pivotElem>elem)end=pivot
sectionLength=end-start
pivot=start+Math.floor(sectionLength/2)
pivotElem=this.elements[pivot]}
if(pivotElem===elem)return pivot
return-1}
lunr.SortedSet.prototype.locationFor=function(elem){var start=0,end=this.elements.length,sectionLength=end-start,pivot=start+Math.floor(sectionLength/2),pivotElem=this.elements[pivot]
while(sectionLength>1){if(pivotElem<elem)start=pivot
if(pivotElem>elem)end=pivot
sectionLength=end-start
pivot=start+Math.floor(sectionLength/2)
pivotElem=this.elements[pivot]}
if(pivotElem>elem)return pivot
if(pivotElem<elem)return pivot+1}
lunr.SortedSet.prototype.intersect=function(otherSet){var intersectSet=new lunr.SortedSet,i=0,j=0,a_len=this.length,b_len=otherSet.length,a=this.elements,b=otherSet.elements
while(true){if(i>a_len-1||j>b_len-1)break
if(a[i]===b[j]){intersectSet.add(a[i])
i++,j++
continue}
if(a[i]<b[j]){i++
continue}
if(a[i]>b[j]){j++
continue}};return intersectSet}
lunr.SortedSet.prototype.clone=function(){var clone=new lunr.SortedSet
clone.elements=this.toArray()
clone.length=clone.elements.length
return clone}
lunr.SortedSet.prototype.union=function(otherSet){var longSet,shortSet,unionSet
if(this.length>=otherSet.length){longSet=this,shortSet=otherSet}else{longSet=otherSet,shortSet=this}
unionSet=longSet.clone()
for(var i=0,shortSetElements=shortSet.toArray();i<shortSetElements.length;i++){unionSet.add(shortSetElements[i])}
return unionSet}
lunr.SortedSet.prototype.toJSON=function(){return this.toArray()};(function(root,factory){if(typeof define==='function'&&define.amd){define(factory)}else if(typeof exports==='object'){module.exports=factory()}else{root.elasticlunr=factory()}}(this,function(){return elasticlunr}))})();;/*!
* Snowball JavaScript Library v0.3
* http://code.google.com/p/urim/
* http://snowball.tartarus.org/
*
* Copyright 2010, Oleg Mazko
* http://www.mozilla.org/MPL/
*/;(function(root,factory){if(typeof define==='function'&&define.amd){define(factory)}else if(typeof exports==='object'){module.exports=factory()}else{factory()(root.lunr);}}(this,function(){return function(lunr){lunr.stemmerSupport={Among:function(s,substring_i,result,method){this.toCharArray=function(s){var sLength=s.length,charArr=new Array(sLength);for(var i=0;i<sLength;i++)
charArr[i]=s.charCodeAt(i);return charArr;};if((!s&&s!="")||(!substring_i&&(substring_i!=0))||!result)
throw("Bad Among initialisation: s:"+s+", substring_i: "
+substring_i+", result: "+result);this.s_size=s.length;this.s=this.toCharArray(s);this.substring_i=substring_i;this.result=result;this.method=method;},SnowballProgram:function(){var current;return{bra:0,ket:0,limit:0,cursor:0,limit_backward:0,setCurrent:function(word){current=word;this.cursor=0;this.limit=word.length;this.limit_backward=0;this.bra=this.cursor;this.ket=this.limit;},getCurrent:function(){var result=current;current=null;return result;},in_grouping:function(s,min,max){if(this.cursor<this.limit){var ch=current.charCodeAt(this.cursor);if(ch<=max&&ch>=min){ch-=min;if(s[ch>>3]&(0X1<<(ch&0X7))){this.cursor++;return true;}}}
return false;},in_grouping_b:function(s,min,max){if(this.cursor>this.limit_backward){var ch=current.charCodeAt(this.cursor-1);if(ch<=max&&ch>=min){ch-=min;if(s[ch>>3]&(0X1<<(ch&0X7))){this.cursor--;return true;}}}
return false;},out_grouping:function(s,min,max){if(this.cursor<this.limit){var ch=current.charCodeAt(this.cursor);if(ch>max||ch<min){this.cursor++;return true;}
ch-=min;if(!(s[ch>>3]&(0X1<<(ch&0X7)))){this.cursor++;return true;}}
return false;},out_grouping_b:function(s,min,max){if(this.cursor>this.limit_backward){var ch=current.charCodeAt(this.cursor-1);if(ch>max||ch<min){this.cursor--;return true;}
ch-=min;if(!(s[ch>>3]&(0X1<<(ch&0X7)))){this.cursor--;return true;}}
return false;},eq_s:function(s_size,s){if(this.limit-this.cursor<s_size)
return false;for(var i=0;i<s_size;i++)
if(current.charCodeAt(this.cursor+i)!=s.charCodeAt(i))
return false;this.cursor+=s_size;return true;},eq_s_b:function(s_size,s){if(this.cursor-this.limit_backward<s_size)
return false;for(var i=0;i<s_size;i++)
if(current.charCodeAt(this.cursor-s_size+i)!=s.charCodeAt(i))
return false;this.cursor-=s_size;return true;},find_among:function(v,v_size){var i=0,j=v_size,c=this.cursor,l=this.limit,common_i=0,common_j=0,first_key_inspected=false;while(true){var k=i+((j-i)>>1),diff=0,common=common_i<common_j?common_i:common_j,w=v[k];for(var i2=common;i2<w.s_size;i2++){if(c+common==l){diff=-1;break;}
diff=current.charCodeAt(c+common)-w.s[i2];if(diff)
break;common++;}
if(diff<0){j=k;common_j=common;}else{i=k;common_i=common;}
if(j-i<=1){if(i>0||j==i||first_key_inspected)
break;first_key_inspected=true;}}
while(true){var w=v[i];if(common_i>=w.s_size){this.cursor=c+w.s_size;if(!w.method)
return w.result;var res=w.method();this.cursor=c+w.s_size;if(res)
return w.result;}
i=w.substring_i;if(i<0)
return 0;}},find_among_b:function(v,v_size){var i=0,j=v_size,c=this.cursor,lb=this.limit_backward,common_i=0,common_j=0,first_key_inspected=false;while(true){var k=i+((j-i)>>1),diff=0,common=common_i<common_j?common_i:common_j,w=v[k];for(var i2=w.s_size-1-common;i2>=0;i2--){if(c-common==lb){diff=-1;break;}
diff=current.charCodeAt(c-1-common)-w.s[i2];if(diff)
break;common++;}
if(diff<0){j=k;common_j=common;}else{i=k;common_i=common;}
if(j-i<=1){if(i>0||j==i||first_key_inspected)
break;first_key_inspected=true;}}
while(true){var w=v[i];if(common_i>=w.s_size){this.cursor=c-w.s_size;if(!w.method)
return w.result;var res=w.method();this.cursor=c-w.s_size;if(res)
return w.result;}
i=w.substring_i;if(i<0)
return 0;}},replace_s:function(c_bra,c_ket,s){var adjustment=s.length-(c_ket-c_bra),left=current.substring(0,c_bra),right=current.substring(c_ket);current=left+s+right;this.limit+=adjustment;if(this.cursor>=c_ket)
this.cursor+=adjustment;else if(this.cursor>c_bra)
this.cursor=c_bra;return adjustment;},slice_check:function(){if(this.bra<0||this.bra>this.ket||this.ket>this.limit||this.limit>current.length)
throw("faulty slice operation");},slice_from:function(s){this.slice_check();this.replace_s(this.bra,this.ket,s);},slice_del:function(){this.slice_from("");},insert:function(c_bra,c_ket,s){var adjustment=this.replace_s(c_bra,c_ket,s);if(c_bra<=this.bra)
this.bra+=adjustment;if(c_bra<=this.ket)
this.ket+=adjustment;},slice_to:function(){this.slice_check();return current.substring(this.bra,this.ket);},eq_v_b:function(s){return this.eq_s_b(s.length,s);}};}};lunr.trimmerSupport={generateTrimmer:function(wordCharacters){var startRegex=new RegExp("^[^"+wordCharacters+"]+")
var endRegex=new RegExp("[^"+wordCharacters+"]+$")
return function(token){if(typeof token.update==="function"){return token.update(function(s){return s.replace(startRegex,'').replace(endRegex,'');})}else{return token.replace(startRegex,'').replace(endRegex,'');}};}}}}));;;(function(root,factory){if(typeof define==='function'&&define.amd){define(factory)}else if(typeof exports==='object'){module.exports=factory()}else{factory()(root.lunr);}}(this,function(){return function(lunr){lunr.multiLanguage=function(){var languages=Array.prototype.slice.call(arguments);var nameSuffix=languages.join('-');var wordCharacters="";var pipeline=[];var searchPipeline=[];for(var i=0;i<languages.length;++i){if(languages[i]=='en'){wordCharacters+='\\w';pipeline.unshift(lunr.stopWordFilter);pipeline.push(lunr.stemmer);searchPipeline.push(lunr.stemmer);}else{wordCharacters+=lunr[languages[i]].wordCharacters;if(lunr[languages[i]].stopWordFilter){pipeline.unshift(lunr[languages[i]].stopWordFilter);}
if(lunr[languages[i]].stemmer){pipeline.push(lunr[languages[i]].stemmer);searchPipeline.push(lunr[languages[i]].stemmer);}}};var multiTrimmer=lunr.trimmerSupport.generateTrimmer(wordCharacters);lunr.Pipeline.registerFunction(multiTrimmer,'lunr-multi-trimmer-'+nameSuffix);pipeline.unshift(multiTrimmer);return function(){this.pipeline.reset();this.pipeline.add.apply(this.pipeline,pipeline);if(this.searchPipeline){this.searchPipeline.reset();this.searchPipeline.add.apply(this.searchPipeline,searchPipeline);}};}}}));;/*!
* Lunr languages, `Russian` language
* https://github.com/MihaiValentin/lunr-languages
*
* Copyright 2014, Mihai Valentin
* http://www.mozilla.org/MPL/
*//*!
* based on
* Snowball JavaScript Library v0.3
* http://code.google.com/p/urim/
* http://snowball.tartarus.org/
*
* Copyright 2010, Oleg Mazko
* http://www.mozilla.org/MPL/
*/;(function(root,factory){if(typeof define==='function'&&define.amd){define(factory)}else if(typeof exports==='object'){module.exports=factory()}else{factory()(root.lunr);}}(this,function(){return function(lunr){if('undefined'===typeof lunr){throw new Error('Lunr is not present. Please include / require Lunr before this script.');}
if('undefined'===typeof lunr.stemmerSupport){throw new Error('Lunr stemmer support is not present. Please include / require Lunr stemmer support before this script.');}
lunr.ru=function(){this.pipeline.reset();this.pipeline.add(lunr.ru.trimmer,lunr.ru.stopWordFilter,lunr.ru.stemmer);if(this.searchPipeline){this.searchPipeline.reset();this.searchPipeline.add(lunr.ru.stemmer)}};lunr.ru.wordCharacters="\u0400-\u0484\u0487-\u052F\u1D2B\u1D78\u2DE0-\u2DFF\uA640-\uA69F\uFE2E\uFE2F";lunr.ru.trimmer=lunr.trimmerSupport.generateTrimmer(lunr.ru.wordCharacters);lunr.Pipeline.registerFunction(lunr.ru.trimmer,'trimmer-ru');lunr.ru.stemmer=(function(){var Among=lunr.stemmerSupport.Among,SnowballProgram=lunr.stemmerSupport.SnowballProgram,st=new function RussianStemmer(){var a_0=[new Among("\u0432",-1,1),new Among("\u0438\u0432",0,2),new Among("\u044B\u0432",0,2),new Among("\u0432\u0448\u0438",-1,1),new Among("\u0438\u0432\u0448\u0438",3,2),new Among("\u044B\u0432\u0448\u0438",3,2),new Among("\u0432\u0448\u0438\u0441\u044C",-1,1),new Among("\u0438\u0432\u0448\u0438\u0441\u044C",6,2),new Among("\u044B\u0432\u0448\u0438\u0441\u044C",6,2)],a_1=[new Among("\u0435\u0435",-1,1),new Among("\u0438\u0435",-1,1),new Among("\u043E\u0435",-1,1),new Among("\u044B\u0435",-1,1),new Among("\u0438\u043C\u0438",-1,1),new Among("\u044B\u043C\u0438",-1,1),new Among("\u0435\u0439",-1,1),new Among("\u0438\u0439",-1,1),new Among("\u043E\u0439",-1,1),new Among("\u044B\u0439",-1,1),new Among("\u0435\u043C",-1,1),new Among("\u0438\u043C",-1,1),new Among("\u043E\u043C",-1,1),new Among("\u044B\u043C",-1,1),new Among("\u0435\u0433\u043E",-1,1),new Among("\u043E\u0433\u043E",-1,1),new Among("\u0435\u043C\u0443",-1,1),new Among("\u043E\u043C\u0443",-1,1),new Among("\u0438\u0445",-1,1),new Among("\u044B\u0445",-1,1),new Among("\u0435\u044E",-1,1),new Among("\u043E\u044E",-1,1),new Among("\u0443\u044E",-1,1),new Among("\u044E\u044E",-1,1),new Among("\u0430\u044F",-1,1),new Among("\u044F\u044F",-1,1)],a_2=[new Among("\u0435\u043C",-1,1),new Among("\u043D\u043D",-1,1),new Among("\u0432\u0448",-1,1),new Among("\u0438\u0432\u0448",2,2),new Among("\u044B\u0432\u0448",2,2),new Among("\u0449",-1,1),new Among("\u044E\u0449",5,1),new Among("\u0443\u044E\u0449",6,2)],a_3=[new Among("\u0441\u044C",-1,1),new Among("\u0441\u044F",-1,1)],a_4=[new Among("\u043B\u0430",-1,1),new Among("\u0438\u043B\u0430",0,2),new Among("\u044B\u043B\u0430",0,2),new Among("\u043D\u0430",-1,1),new Among("\u0435\u043D\u0430",3,2),new Among("\u0435\u0442\u0435",-1,1),new Among("\u0438\u0442\u0435",-1,2),new Among("\u0439\u0442\u0435",-1,1),new Among("\u0435\u0439\u0442\u0435",7,2),new Among("\u0443\u0439\u0442\u0435",7,2),new Among("\u043B\u0438",-1,1),new Among("\u0438\u043B\u0438",10,2),new Among("\u044B\u043B\u0438",10,2),new Among("\u0439",-1,1),new Among("\u0435\u0439",13,2),new Among("\u0443\u0439",13,2),new Among("\u043B",-1,1),new Among("\u0438\u043B",16,2),new Among("\u044B\u043B",16,2),new Among("\u0435\u043C",-1,1),new Among("\u0438\u043C",-1,2),new Among("\u044B\u043C",-1,2),new Among("\u043D",-1,1),new Among("\u0435\u043D",22,2),new Among("\u043B\u043E",-1,1),new Among("\u0438\u043B\u043E",24,2),new Among("\u044B\u043B\u043E",24,2),new Among("\u043D\u043E",-1,1),new Among("\u0435\u043D\u043E",27,2),new Among("\u043D\u043D\u043E",27,1),new Among("\u0435\u0442",-1,1),new Among("\u0443\u0435\u0442",30,2),new Among("\u0438\u0442",-1,2),new Among("\u044B\u0442",-1,2),new Among("\u044E\u0442",-1,1),new Among("\u0443\u044E\u0442",34,2),new Among("\u044F\u0442",-1,2),new Among("\u043D\u044B",-1,1),new Among("\u0435\u043D\u044B",37,2),new Among("\u0442\u044C",-1,1),new Among("\u0438\u0442\u044C",39,2),new Among("\u044B\u0442\u044C",39,2),new Among("\u0435\u0448\u044C",-1,1),new Among("\u0438\u0448\u044C",-1,2),new Among("\u044E",-1,2),new Among("\u0443\u044E",44,2)],a_5=[new Among("\u0430",-1,1),new Among("\u0435\u0432",-1,1),new Among("\u043E\u0432",-1,1),new Among("\u0435",-1,1),new Among("\u0438\u0435",3,1),new Among("\u044C\u0435",3,1),new Among("\u0438",-1,1),new Among("\u0435\u0438",6,1),new Among("\u0438\u0438",6,1),new Among("\u0430\u043C\u0438",6,1),new Among("\u044F\u043C\u0438",6,1),new Among("\u0438\u044F\u043C\u0438",10,1),new Among("\u0439",-1,1),new Among("\u0435\u0439",12,1),new Among("\u0438\u0435\u0439",13,1),new Among("\u0438\u0439",12,1),new Among("\u043E\u0439",12,1),new Among("\u0430\u043C",-1,1),new Among("\u0435\u043C",-1,1),new Among("\u0438\u0435\u043C",18,1),new Among("\u043E\u043C",-1,1),new Among("\u044F\u043C",-1,1),new Among("\u0438\u044F\u043C",21,1),new Among("\u043E",-1,1),new Among("\u0443",-1,1),new Among("\u0430\u0445",-1,1),new Among("\u044F\u0445",-1,1),new Among("\u0438\u044F\u0445",26,1),new Among("\u044B",-1,1),new Among("\u044C",-1,1),new Among("\u044E",-1,1),new Among("\u0438\u044E",30,1),new Among("\u044C\u044E",30,1),new Among("\u044F",-1,1),new Among("\u0438\u044F",33,1),new Among("\u044C\u044F",33,1)],a_6=[new Among("\u043E\u0441\u0442",-1,1),new Among("\u043E\u0441\u0442\u044C",-1,1)],a_7=[new Among("\u0435\u0439\u0448\u0435",-1,1),new Among("\u043D",-1,2),new Among("\u0435\u0439\u0448",-1,1),new Among("\u044C",-1,3)],g_v=[33,65,8,232],I_p2,I_pV,sbp=new SnowballProgram();this.setCurrent=function(word){sbp.setCurrent(word);};this.getCurrent=function(){return sbp.getCurrent();};function habr3(){while(!sbp.in_grouping(g_v,1072,1103)){if(sbp.cursor>=sbp.limit)
return false;sbp.cursor++;}
return true;}
function habr4(){while(!sbp.out_grouping(g_v,1072,1103)){if(sbp.cursor>=sbp.limit)
return false;sbp.cursor++;}
return true;}
function r_mark_regions(){I_pV=sbp.limit;I_p2=I_pV;if(habr3()){I_pV=sbp.cursor;if(habr4())
if(habr3())
if(habr4())
I_p2=sbp.cursor;}}
function r_R2(){return I_p2<=sbp.cursor;}
function habr2(a,n){var among_var,v_1;sbp.ket=sbp.cursor;among_var=sbp.find_among_b(a,n);if(among_var){sbp.bra=sbp.cursor;switch(among_var){case 1:v_1=sbp.limit-sbp.cursor;if(!sbp.eq_s_b(1,"\u0430")){sbp.cursor=sbp.limit-v_1;if(!sbp.eq_s_b(1,"\u044F"))
return false;}
case 2:sbp.slice_del();break;}
return true;}
return false;}
function r_perfective_gerund(){return habr2(a_0,9);}
function habr1(a,n){var among_var;sbp.ket=sbp.cursor;among_var=sbp.find_among_b(a,n);if(among_var){sbp.bra=sbp.cursor;if(among_var==1)
sbp.slice_del();return true;}
return false;}
function r_adjective(){return habr1(a_1,26);}
function r_adjectival(){var among_var;if(r_adjective()){habr2(a_2,8);return true;}
return false;}
function r_reflexive(){return habr1(a_3,2);}
function r_verb(){return habr2(a_4,46);}
function r_noun(){habr1(a_5,36);}
function r_derivational(){var among_var;sbp.ket=sbp.cursor;among_var=sbp.find_among_b(a_6,2);if(among_var){sbp.bra=sbp.cursor;if(r_R2()&&among_var==1)
sbp.slice_del();}}
function r_tidy_up(){var among_var;sbp.ket=sbp.cursor;among_var=sbp.find_among_b(a_7,4);if(among_var){sbp.bra=sbp.cursor;switch(among_var){case 1:sbp.slice_del();sbp.ket=sbp.cursor;if(!sbp.eq_s_b(1,"\u043D"))
break;sbp.bra=sbp.cursor;case 2:if(!sbp.eq_s_b(1,"\u043D"))
break;case 3:sbp.slice_del();break;}}}
this.stem=function(){r_mark_regions();sbp.cursor=sbp.limit;if(sbp.cursor<I_pV)
return false;sbp.limit_backward=I_pV;if(!r_perfective_gerund()){sbp.cursor=sbp.limit;if(!r_reflexive())
sbp.cursor=sbp.limit;if(!r_adjectival()){sbp.cursor=sbp.limit;if(!r_verb()){sbp.cursor=sbp.limit;r_noun();}}}
sbp.cursor=sbp.limit;sbp.ket=sbp.cursor;if(sbp.eq_s_b(1,"\u0438")){sbp.bra=sbp.cursor;sbp.slice_del();}else
sbp.cursor=sbp.limit;r_derivational();sbp.cursor=sbp.limit;r_tidy_up();return true;}};return function(token){if(typeof token.update==="function"){return token.update(function(word){st.setCurrent(word);st.stem();return st.getCurrent();})}else{st.setCurrent(token);st.stem();return st.getCurrent();}}})();lunr.Pipeline.registerFunction(lunr.ru.stemmer,'stemmer-ru');lunr.ru.stopWordFilter=lunr.generateStopWordFilter('алло без близко более больше будем будет будете будешь будто буду будут будь бы бывает бывь был была были было быть в важная важное важные важный вам вами вас ваш ваша ваше ваши вверх вдали вдруг ведь везде весь вниз внизу во вокруг вон восемнадцатый восемнадцать восемь восьмой вот впрочем времени время все всегда всего всем всеми всему всех всею всю всюду вся всё второй вы г где говорил говорит год года году да давно даже далеко дальше даром два двадцатый двадцать две двенадцатый двенадцать двух девятнадцатый девятнадцать девятый девять действительно дел день десятый десять для до довольно долго должно другая другие других друго другое другой е его ее ей ему если есть еще ещё ею её ж же жизнь за занят занята занято заняты затем зато зачем здесь значит и из или им именно иметь ими имя иногда их к каждая каждое каждые каждый кажется как какая какой кем когда кого ком кому конечно которая которого которой которые который которых кроме кругом кто куда лет ли лишь лучше люди м мало между меля менее меньше меня миллионов мимо мира мне много многочисленная многочисленное многочисленные многочисленный мной мною мог могут мож может можно можхо мои мой мор мочь моя моё мы на наверху над надо назад наиболее наконец нам нами нас начала наш наша наше наши не него недавно недалеко нее ней нельзя нем немного нему непрерывно нередко несколько нет нею неё ни нибудь ниже низко никогда никуда ними них ничего но ну нужно нх о об оба обычно один одиннадцатый одиннадцать однажды однако одного одной около он она они оно опять особенно от отовсюду отсюда очень первый перед по под пожалуйста позже пока пор пора после посреди потом потому почему почти прекрасно при про просто против процентов пятнадцатый пятнадцать пятый пять раз разве рано раньше рядом с сам сама сами самим самими самих само самого самой самом самому саму свое своего своей свои своих свою сеаой себе себя сегодня седьмой сейчас семнадцатый семнадцать семь сих сказал сказала сказать сколько слишком сначала снова со собой собою совсем спасибо стал суть т та так такая также такие такое такой там твой твоя твоё те тебе тебя тем теми теперь тех то тобой тобою тогда того тоже только том тому тот тою третий три тринадцатый тринадцать ту туда тут ты тысяч у уж уже уметь хорошо хотеть хоть хотя хочешь часто чаще чего человек чем чему через четвертый четыре четырнадцатый четырнадцать что чтоб чтобы чуть шестнадцатый шестнадцать шестой шесть эта эти этим этими этих это этого этой этом этому этот эту я ﻿а'.split(' '));lunr.Pipeline.registerFunction(lunr.ru.stopWordFilter,'stopWordFilter-ru');};}))