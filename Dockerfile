FROM ubuntu:16.04

RUN apt-get update && \
	apt-get install -y curl && \
	curl -sL https://deb.nodesource.com/setup_6.x \
	| bash - && \
	apt-get install -y \
		build-essential \
		node-gyp \
		nodejs && \
	mkdir /opt/app

WORKDIR /opt/app

EXPOSE 3000

CMD ["npm", "start"]