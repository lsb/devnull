#!flask/bin/python

## To start service
##		//serverSplitter$ source flask/bin/activate
##		//(flask)serverSplitter$ ./dumpTex.py
##
## Outputs results in JSON (with character-level tracking)
## Tries to handle LaTeX macros (to handle include, see old dumpTex...)
## Expands some commands such as \emph{hello}, but skips others such as $x + y$ 

### INSTALLATION
####
## see virtualenv
####



import sys
import re
import os
import subprocess
import pexpect
import json 
import codecs

import nltk.data
tokenizer = nltk.data.load('tokenizers/punkt/english.pickle')

#from nltk.tokenize.punkt import PunktSentenceTokenizer, PunktParameters
#punkt_param = PunktParameters()
#punkt_param.abbrev_types = set(['dr', 'vs', 'mr', 'mrs', 'prof', 'inc', 'ie','eg','fig','chap','sec'])
#sentence_splitter = PunktSentenceTokenizer(punkt_param)

sentence_splitter = nltk.tokenize.PunktSentenceTokenizer()
abbreviations = ['i.e','e.g']
for abbrev in abbreviations:
  sentence_splitter._params.abbrev_types.add(abbrev)
    

from time import sleep ###hack

###########################

### for runtime stack inspection in case of stalls

import code, traceback, signal

def debug(sig, frame):
    """Interrupt running process, and provide a python prompt for
    interactive debugging."""
    d={'_frame':frame}         # Allow access to frame object.
    d.update(frame.f_globals)  # Unless shadowed by global
    d.update(frame.f_locals)

    i = code.InteractiveConsole(d)
    message  = "Signal recieved : entering python shell.\nTraceback:\n"
    message += ''.join(traceback.format_stack(frame))
    i.interact(message)

def listen():
    signal.signal(signal.SIGUSR1, debug)  # Register handler

listen()

############################







 

tokIncomplete = re.compile("No complete linkages found")
tokOk = re.compile("Found .* had no P.P. violations\)")


def writeDict (words):
  with open('dict', 'w') as f:
    s = '\n'.join(words)
    f.write(s)
    f.flush()



tokExpandCommands = re.compile(r'\\(ref|subref|sched|caption|emph|textbf|textit|title|section|subsection|subsubsection|subsubsubsection)')
tokCommand = re.compile(r'(\\begin{tabular}.*?\\end{tabular})|(\\begin{lstlisting}.*?\\end{lstlisting})|(\\begin{grammar}.*?\\end{grammar})|(\\((\\\\)| |(([\xc4-\xfc]|\w|[:])*(\*|({[^}]*})|\[[^]]*\])*)))', re.DOTALL)
tokText = re.compile(ur'(\w|[\xc4-\xfc]|[\-\u2013\u2014\'-\+#])+|((\$)?[0-9]+(,|[\.xX+]|(\xb0|\\%))?)')
tokNoise = re.compile(ur'(\xb0|\ufeff|\u200b|\$.*\$)|[${},\u2026:\n\r \t.!<>;`"\u2018\u2019\u201c\u201d\u0060\u00b4|*#=@&~\[\]\+\?\(\)/]|(%.*(\n|$))')

def words (paragraph, firstLine):
  line = 0 #line in paragraph 
  lineOffset = 0
  totalOffset = 0
  end = len(paragraph)
  while totalOffset < end:
    hit = tokText.match(paragraph, totalOffset)
    if hit:
      word = paragraph[hit.start():hit.end()]
      yield (line, lineOffset, totalOffset, word)
      totalOffset = hit.end()
      lineOffset = lineOffset + len(word) ##no line breaks
      continue
    hit = tokExpandCommands.match(paragraph, totalOffset)
    if hit:
      totalOffset = hit.end()
      lineOffset = lineOffset + (hit.end() - hit.start()) ##no line breaks
      continue
    hit = tokCommand.match(paragraph, totalOffset)
    if hit:
      totalOffset = hit.end()
      lineOffset = lineOffset + (hit.end() - hit.start()) ##no line breaks, only \include
      #print 'command', paragraph[hit.start():hit.end()]
      continue
    hit = tokNoise.match(paragraph, totalOffset)
    if hit:
      totalOffset = hit.end()
      word = paragraph[hit.start():hit.end()]
      line = line + len(re.findall('\n',word))
      splits = re.split(r'\n+',word)
      if len(splits) > 1:
        lineOffset = len(splits[len(splits) - 1])
      else:
        lineOffset = lineOffset + len(splits[0]) 
      #print  'noise', paragraph[hit.start():hit.end()].strip()
      continue
    #known errors:
    #$i: 
    raise  Exception('unknown', paragraph[totalOffset:(totalOffset+5)], paragraph[(totalOffset-20):(totalOffset+20)])

tokParagraph = re.compile(r'(\n|\r)((\n|\r)+)')
def paragraphs(fullFile):
      
    includeLen = len('\\include')
    inputLen = len('\\input')
    def replaceNonInput (match):
      if '\\include' == fullFile[match.start():(match.start() + includeLen)]:
        return fullFile[match.start():match.end()]
      if '\\input' == fullFile[match.start():(match.start() + inputLen)]:
        return fullFile[match.start():match.end()]
      if tokExpandCommands.match(fullFile[match.start():match.end()]):
        return fullFile[match.start():match.end()]
       
      nonLines = fullFile[match.start():match.end()].replace('\n','')
      numLines = match.end() - match.start() - len(nonLines)
      res = ''.join([' ' for i in range(match.start(), match.end())])
      out = res if numLines == 0 else  ('' + res[0:-numLines] + ''.join(['\n' for i in range(0,numLines)]))
      #print '======================replace'
      #print fullFile[match.start():match.end()]
      #print '----------------------' 
      #print out
      #print '----------------------' 
      #print len(fullFile[match.start():match.end()]), len(out)
      return out
    stripped = tokCommand.sub(replaceNonInput, fullFile)

    #for h in tokCommand.finditer(fullFile):
    #  print 'lstlisting: ', fullFile[h.start():h.end()]
    #  pass
    
    lineNumber = 1
    offset = 0    
    for split in stripped.splitlines(True):
      para = split
      yield (lineNumber, para)
      lineNumber = lineNumber + 1
      offset = offset + len(para)



def inputs(paragraph):
    return re.findall("\\\\(include|input)\{(.*)\}",paragraph)

def paragraphsRec(fileName):
  fileObj = codecs.open(fileName, 'r', "utf-8")
  dir = None
  
  fullFile = ""
  for line in fileObj:
    fullFile = fullFile + line
  
  for (l,p) in paragraphs(fullFile):
    yield (fileName, l, p)
    includes = inputs(p)
    if len(includes) > 0:
      for (_,i) in includes:
        if dir == None:
          dir = os.path.dirname(fileName)
        includeFile = dir + '/' + i + '.tex'
        #print fileName, '->', includeFile
        for v in paragraphsRec(includeFile):
          yield v
  fileObj.close()

def paragraphsText(text):
  for (l,p) in paragraphs(text):
    yield ('webInput', l, p)

def allWords(paragraphs):
 for (f, line, p) in paragraphs:
    for (subLine, offset, totalOffset, w) in words(p, line):
      if w.strip() != "":
        yield (f,line,subLine,offset, totalOffset, w,p)

def allParagraphs(paragraphs):
  lastFile = None
  lastParagraphLine = None
  lastLine = None
  buff = []
  for (f,para,line,c,cTotal, w,pText) in allWords(paragraphs):
    if f == lastFile and para == lastParagraphLine:
      buff.append( (f,para,line,c,cTotal, w,pText) )
    else:
      yield buff
      buff = [ (f,para,line,c,cTotal, w,pText) ]
      lastFile = f
      lastParagraphLine = para
  if len(buff) > 0:
    yield buff

def paragraphToLines(words):
  line = []
  lastLine = None
  for (f,p,l,c,cTotal,w,pText) in words:
    if lastLine == l:
      line.append( (f,p,l,c,cTotal,w,pText) )
    else:
      yield line
      line = [ (f,p,l,c,cTotal,w,pText) ]
      lastLine = l
  if len(line) > 0:
    yield line

sentenceTok = re.compile(r'\n|\.|\?("?)')
def lineToSentences(line):
  if len(line) == 0:
    return

  sentence = []
  (f0,p0,line0,c0,cTotal0,w0,pText0) = line[0]
  (fn,pn,linen,cn,cTotaln,wn,pTextn) = line[len(line)-1]
  para = pText0[cTotal0:(cTotaln + len(wn) + 1)]
  for (start,end) in sentence_splitter.span_tokenize(para):
  	#print para[start:end]  	
  	for (f,p,linei,c,cTotal,w,pText) in line:
  		if cTotal >= start and cTotal <= end:
  			sentence.append( (f,p,linei,c,cTotal,w,pText) )
  	yield sentence
  return

def originalSentence (sent,includePunctuation=True):
  (f,p,l,c,cTotal,w,pText) = sent[0]
  (_,_,_,_,cTotal2,w2,_,) = sent[len(sent)-1]
  return pText[cTotal:(cTotal2 + len(w2)+ (1 if includePunctuation else 0))]



writeDict(['GPU','multicore','TBB','webpage','dataflow','JSON'])

def checkParagraphs(paragraphs):
  for paragraph in allParagraphs(paragraphs):
    if len(paragraph) == 0:
      continue

    (f,para,line,c,cTotal, w,pText) = paragraph[0]    
    yield {'file': f, 
    	'paragraph': pText, 
    	'spans': [startEndSpan for startEndSpan in sentence_splitter.span_tokenize(pText)], 
    	'errors': []}

def dumpJson(paragraphs):
  yield '['
  count = False
  for p in checkParagraphs(paragraphs):
    if count:
      yield ','
    else:
      count = True
    yield json.dumps(p)
    sleep(0.3)
  yield ']'



import zerorpc
class HelloRPC(object):
    def hello(self, text):

    	print('python got text', text)    
    	out = ''
    	for s in dumpJson(paragraphsText(unicode(text, "utf-8"))):
		  print s
		  out = out + s
        
        print 'python done'
        return out

s = zerorpc.Server(HelloRPC())
s.bind("tcp://0.0.0.0:4242")
s.run()