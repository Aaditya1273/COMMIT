# No package install step: the service has zero npm dependencies and runs its
# TypeScript directly under Node's built-in type stripping. The base image is the only
# thing the build fetches, and nothing is fetched at run time.
FROM node:24-alpine
WORKDIR /app
COPY src ./src
ENV PORT=8080 NODE_ENV=production
EXPOSE 8080
USER node
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node", "--no-warnings", "src/server.ts"]
