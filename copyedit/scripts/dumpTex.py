##arg1: textfile

import sys
import re
import os
 
if len(sys.argv) != 2:
	raise Exception('Expected one argument of input file, only got', len(sys.argv))

file = sys.argv[1]


def removeComments(paragraph):
  length = 0
  escaping = False
  for c in paragraph:
    if c == '\\':
      if escaping:
        escaping = False
        length = length + 2
      else:
        escaping = True
    elif c == '%':
      if escaping:
        length = length + 2
        escaping = False
      else:
        break
    else:
      if escaping:
        escaping = False
        length = length + 2
      else:
        length = length + 1
  if length != len(paragraph):
    print 'comments:', paragraph[length:]
  return paragraph[0:length]


tokExpandCommands = re.compile(r'\\(emph|textbf|title|section|subsection|subsubsection|subsubsubsection)')
tokCommand = re.compile(r'(\\begin{lstlisting}.*?\\end{lstlisting})|(\\begin{grammar}.*?\\end{grammar})|(\\( |([a-zA-Z0-9]*(\*|({.*?})|\[.*?\])*)))', re.DOTALL)
tokText = re.compile(r'[a-zA-Z\-0-9\'-]+')
tokNoise = re.compile(r'(\$.*\$)|[{},:\n\r \t.!<>;`|*"#=@&~\[\]\+\?\(\)/]|(%.*(\n|$))')

def words (paragraph):
  offset = 0
  end = len(paragraph)
  while offset < end:
    hit = tokText.match(paragraph, offset)
    if hit:
      yield (offset, paragraph[hit.start():hit.end()])
      offset = hit.end()
      continue
    hit = tokExpandCommands.match(paragraph, offset)
    if hit:
      offset = hit.end()
      #print 'exp command', paragraph[hit.start():hit.end()]
      continue
    hit = tokCommand.match(paragraph, offset)
    if hit:
      offset = hit.end()
      #print 'command', paragraph[hit.start():hit.end()]
      continue
    hit = tokNoise.match(paragraph, offset)
    if hit:
      offset = hit.end()
      #print  'noise', paragraph[hit.start():hit.end()].strip()
      continue
    raise  Exception('unknown', paragraph[offset:(offset+5)], paragraph[(offset-20):(offset+20)])

def paragraphs(file):
    fullFile = ""
    for line in file:
      fullFile = fullFile + line
    
    includeLen= len('\\include')
    def replaceNonInput (match):
      if '\\include' == fullFile[match.start():(match.start() + includeLen)]:
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
    
    lineNumber=0
    for p in stripped.split("\n\n"):
      yield (lineNumber, p)
      lineNumber = lineNumber + 2 + len(re.findall('\n', p))


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


for (f, line, p) in paragraphsRec(file):
  for (offset, w) in words(p):
    if w.strip() != "":
      print '  ',f,':',line,'+',offset,'--',len(w),':',w


