start:
	npm run start

start-dev-server:
	DEV_SERV=true npm run start

build:
	rm -rf dist
	NODE_ENV=production npm run webpack

lint:
	npm run lint
