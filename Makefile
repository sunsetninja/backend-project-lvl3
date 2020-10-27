install:
	npm install
install-ci:
	npm ci
lint:
	npx eslint .
test:
	DEBUG=axios,page-loader npm test
test-coverage:
	npm test -- --coverage --coverageProvider=v8
setup:
	npm install && npm link
