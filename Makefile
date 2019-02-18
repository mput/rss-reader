start:
	npx webpack-dev-server

start-dev-server:
	DEV_SERV=true npx webpack-dev-server

build:
	rm -rf dist
	NODE_ENV=production npx webpack

lint:
	npx eslint .

flow:
	npx flow
