##arg1: textfile

import sys
import re
import os
import subprocess

 
if len(sys.argv) != 2:
	raise Exception('Expected one argument of input file, only got', len(sys.argv))

file = sys.argv[1]




def writeDict (words):
  with open('dict', 'w') as f:
    s = '\n'.join(words)
    f.write(s)
    f.flush()

def spellcheckCall (rawWord, caseSensitive):
  checker = 'ispell' #/opt/local/bin/ispell
  word = rawWord if caseSensitive else rawWord.lower()
  command = 'echo "' + word + '" | ' + checker + ' -a -t -p dict | tail -n +2'
  #print word, command
  return subprocess.check_output(command, shell=True)


def spellcheckSentence(sent):

  orig = map(lambda (f,p,l,c,c2,w,p2): w.strip(), sent)
  terms = map(lambda (f,p,l,c,c2,w,p2): w.replace("-",""), sent)
  skips = re.compile('^(#|\(|\)|([0-9][0-9,.+]*)|\'+|"+|\+)?$')
  terms = map(lambda w: 'skip' if skips.match(w) else w, terms)
  qry = ' '.join(terms)

  out = spellcheckCall(qry, True)
  splits = r'\n'
  outs = re.split(splits, out)[:-2]
  okTok = re.compile(r'\*|\+')
  for i, w in enumerate(outs):
    if okTok.match(w):
      yield (True, sent[i], [])
    elif orig[i].find('-') != -1 and  w.find(': ') != -1 and orig[i] in  w.split(': ')[1].split(', '):
      yield (True, sent[i], [])
    elif w[0] == '&':
      yield (False, sent[i], w.split(': ')[1].split(', '))
    else:
      yield (False, sent[i], [])

tokExpandCommands = re.compile(r'\\(ref|subref|sched|caption|emph|textbf|title|section|subsection|subsubsection|subsubsubsection)')
tokCommand = re.compile(r'(\\begin{tabular}.*?\\end{tabular})|(\\begin{lstlisting}.*?\\end{lstlisting})|(\\begin{grammar}.*?\\end{grammar})|(\\((\\\\)| |([a-zA-Z0-9]*(\*|({.*?})|\[.*?\])*)))', re.DOTALL)
tokText = re.compile(r'[a-zA-Z\-\'-\+#]+|((\$)?[0-9]+(,|[\.xX+]|(\\%))?)')
tokNoise = re.compile(r'(\$.*\$)|[{},:\n\r \t.!<>;`|*"#=@&~\[\]\+\?\(\)/]|(%.*(\n|$))')

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
    raise  Exception('unknown', paragraph[totalOffset:(totalOffset+5)], paragraph[(totalOffset-20):(totalOffset+20)])

tokParagraph = re.compile(r'\n(\n+)')
def paragraphs(file):
    fullFile = ""
    for line in file:
      fullFile = fullFile + line
    
    includeLen= len('\\include')
    def replaceNonInput (match):
      if '\\include' == fullFile[match.start():(match.start() + includeLen)]:
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
    for split in tokParagraph.finditer(stripped):
      para = stripped[offset:split.start()]      
      yield (lineNumber, para)
      lineNumber = lineNumber + (split.end() - split.start()) + len(re.findall('\n',para))
      offset = split.end()



def inputs(paragraph):
    return re.findall('nclude\\{(.*)}',paragraph)

def paragraphsRec(fileName):
  fileObj = open(fileName, 'r')
  dir = None
  for (l,p) in paragraphs(fileObj):
    yield (fileName, l, p)
    includes = inputs(p)
    if len(includes) > 0:
      for i in includes:
        if dir == None:
          dir = os.path.dirname(fileName)
        includeFile = dir + '/' + i + '.tex'
        print fileName, '->', includeFile
        for v in paragraphsRec(includeFile):
          yield v
  fileObj.close()

def allWords():
 for (f, line, p) in paragraphsRec(file):
    for (subLine, offset, totalOffset, w) in words(p, line):
      if w.strip() != "":
        yield (f,line,subLine,offset, totalOffset, w,p)

def allParagraphs():
  lastFile = None
  lastParagraphLine = None
  lastLine = None
  buff = []
  for (f,para,line,c,cTotal, w,pText) in allWords():
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

sentenceTok = re.compile(r'\n|\.')
def lineToSentences(line):
  sentence = []
  offset = 0
  for (f,p,line,c,cTotal,w,pText) in line:
    if sentenceTok.search(pText[offset:cTotal]):
      if len(sentence) > 0:
        yield sentence
      sentence = [ (f,p,line,c,cTotal,w,pText) ]
      offset = cTotal + len(w)
    else:
      sentence.append( (f,p,line,c,cTotal,w,pText) )
      offset = cTotal + len(w)
  if len(sentence) > 0:
    yield sentence

def originalSentence (sent,includePunctuation=True):
  (f,p,l,c,cTotal,w,pText) = sent[0]
  (_,_,_,_,cTotal2,w2,_,) = sent[len(sent)-1]
  return pText[cTotal:(cTotal2 + len(w2)+ (1 if includePunctuation else 0))]



writeDict(['GPU','multicore'])
minWords = 2
count = 0
for paragraph in allParagraphs():
  sys.stdout.flush()
  for line in paragraphToLines(paragraph):
    for sent in lineToSentences(line):
      if len(sent) <= minWords:
        continue
      for (stat, (f,p,l,c,cTotal,w,pText), sugg) in spellcheckSentence(sent):
        if stat == False:
          print
          print f.split("/")[-1],(p+l),c,':',w, '->', sugg
          print '     "', originalSentence(sent),'"'


