FROM gliderlabs/herokuish
COPY . /app
RUN herokuish buildpack build && export
EXPOSE 1337
CMD ["/start", "web"]