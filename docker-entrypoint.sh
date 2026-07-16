#!/bin/sh
set -e

# Railway mounts the uploads Volume at runtime, as root:root, *over* the mount
# point — so ownership set during the image build is discarded. The container
# therefore starts as root purely to fix the volume, then drops to the
# unprivileged `nextjs` user to actually run the server.
#
# UPLOAD_DIR is where the app reads/writes uploads (see src/lib/storage.ts).
# Skipped when the container is already running unprivileged, or when the
# directory is absent (no volume attached — e.g. a local `docker run`).
if [ "$(id -u)" = "0" ] && [ -n "${UPLOAD_DIR:-}" ]; then
  mkdir -p "$UPLOAD_DIR"
  chown -R nextjs:nodejs "$UPLOAD_DIR"
  exec su-exec nextjs "$@"
fi

exec "$@"
