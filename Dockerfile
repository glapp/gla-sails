FROM node:slim

ADD . /gla-sails
RUN cd /gla-sails; npm install

WORKDIR /gla-sails

# ADD config/certs /root/.docker/machine/certs
ENV CERT_PATH /gla-sails/config/certs
# ENV SWARM_HOST 192.168.99.101:3376

EXPOSE 1337

CMD ["npm", "start"]
