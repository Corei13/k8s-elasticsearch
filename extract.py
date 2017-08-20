for y in open('all.yml').read().split('---')[1:]:
	y = filter(lambda s: s.strip(), y.split('\n'))
	n = y[0][34:]
	with open(n, 'w') as f:
		f.write('\n'.join(y) + '\n')

