#!/usr/bin/env bash
set -o errexit
# this script expects the docker image to be tagged 'playstation-discord' during the build like this:
# docker build -t playstation-discord .

docker rm playstation-discord || true
exec docker run -it \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -e DISPLAY=$DISPLAY \
  -v $HOME/.Xauthority:/root/.Xauthority \
  --network="host" \
  -v ${XDG_RUNTIME_DIR}/discord-ipc-0:/tmp/discord-ipc-0 \
  --name playstation-discord \
  playstation-discord
