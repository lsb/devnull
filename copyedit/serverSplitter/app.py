#!flask/bin/python
from flask import Flask, jsonify, request
import random

app = Flask(__name__)

recentKeys = []
dict = {}
  
#http://localhost:5000/testPost
#curl -i -H "Content-Type: application/json" -X POST -d '{"text":"Read a book"}' http://localhost:5000/split-lines
@app.route('/split-lines', methods = ['POST'])
def testPutter():

  print('POST split-lines')

  if not request.json:
    print 'bad text POST: not json'
    abort(400)
  if not 'text' in request.json:
    print 'bad text POST: no field text'
    abort(400)
  if len(request.json['text'] > 1000000):
    print 'bad text POST: text too long'
    abort(400)
    
  print('got', request.json['text'])
    
  key = None
  while (not key) or key in dict:
    key = 'key' + str(random.randint(1, 1000000000000))
  recentKeys.append(key)
  
  if len(recentKeys) > 1000:
    print('flushing old text')
    for oldKey in recentKeys[0:1000]:
      del dict[oldKey]
      #TODO kill proc if outstanding?
    recentKeys = recentKeys[1000:len(recentKeys)]

  return jsonify( {'key': key} ), 201
  

if __name__ == '__main__':
    app.run(debug = True)
