# Pocketful stage 1 — calibration target

> **Not a submission stage.** This service was written by hand, outside the BAND room,
> to calibrate COMMIT's verifier: it is the known-good candidate the mutation campaign
> seeds defects into. Under the event rules hand-built code does not count, so it must
> never be copied into a submission's `stage-N/` folder. See `../README.md`.

## Build and run (clean container, no outbound network at run time)

```sh
docker build -t pocketful-calibration calibration/pocketful-stage-1
docker run --rm -e PORT=8080 -p 8080:8080 pocketful-calibration
curl http://127.0.0.1:8080/health   # {"status":"ok"}
```

Offline check — the container gets no network at all, and is probed from inside:

```sh
docker run -d --name pf-offline --network none -e PORT=8080 pocketful-calibration
docker exec pf-offline wget -qO- http://127.0.0.1:8080/health
docker rm -f pf-offline
```

## Run without Docker

Node 22.18 or newer (type stripping on by default):

```sh
PORT=8080 node --no-warnings calibration/pocketful-stage-1/src/server.ts
```

State is in memory and ends with the process; the specification allows this
(`stage-1.md` §2, "state need not survive a container restart").
