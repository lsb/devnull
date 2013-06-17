K = [2,4,8,16,32,64,128,256,512,1024]
VLEN = [2,4,8,16,32,64,128,256,512,1024]

from random import randint





def trial (n,k):
	return [randint(0,k-1) for i in range(0,n)]

def repeatsStep (n, k):
	data = sorted(trial(n, k))
	cats = 0
	while len(data) > 0:
		cats = cats + 1
		data = [v for v in data if v != data[0]]
	return cats
def expectedRepeats(n, k):
	return sum([repeatsStep(n, k) for i in range(0,200)])/200.0	
	
def uc(data, vlen,n,k):
	i = 0
	steps = 0
	while i <= n:
		elts = data[i:min(i+vlen, len(data))]	
		#branch on first
		while len(elts) > 0:
			steps = steps + 1
			elts = [v for v in elts if v != elts[0]]
		i = i + vlen
	return n / (steps + 0.0)	

def unclustered (vlen, n,k):
	t = 100
	v = sum([uc(trial(n,k), vlen, n, k) for r in range(0,t)])/(t + 0.0)
	return v

def clustered (vlen,n,k):
	t = 100
	v = sum([uc(sorted(trial(n,k)), vlen, n, k) for r in range(0,t)])/(t + 0.0)
	return v


print('expected number of cats')
for i in K:
	print i, expectedRepeats(1024, i)


print VLEN
print('==unclustered==')
for i in K:
	print i, ([unclustered(v, 1024, i) for v in VLEN])
print('==clustered==')
for i in K:
	print i, ([clustered(v, 1024, i) for v in VLEN])

