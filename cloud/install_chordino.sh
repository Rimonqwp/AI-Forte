#!/bin/sh
set -eu
# Chordino / NNLS Chroma, GPL-2.0-or-later, Queen Mary University of London.
CHORDINO_REV=4c5f214a75cb354f8d8c933e161377c5b4d83713
apt-get update
apt-get install -y --no-install-recommends g++ make curl ca-certificates libboost-dev vamp-plugin-sdk
mkdir -p /tmp/chordino-src /usr/local/lib/vamp /usr/share/doc/chordino
curl -fsSL "https://codeload.github.com/c4dm/nnls-chroma/tar.gz/$CHORDINO_REV" | tar -xz -C /tmp/chordino-src --strip-components=1
make -C /tmp/chordino-src -f Makefile.linux -j2 VAMP_SDK_DIR=/usr/include
cp /tmp/chordino-src/nnls-chroma.so /usr/local/lib/vamp/
cp /tmp/chordino-src/COPYING /usr/share/doc/chordino/
printf '%s\n' "https://github.com/c4dm/nnls-chroma/tree/$CHORDINO_REV" > /usr/share/doc/chordino/SOURCE
pip install setuptools wheel
pip install --no-build-isolation vamp==1.1.0
rm -rf /tmp/chordino-src /var/lib/apt/lists/*
