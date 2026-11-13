#!/bin/sh
# VPN build: the app as kit/tools/test_ridetube.js runs it - the package tools/patch_app.py makes (from JustAnotherPU's
# published one), unpacked into dist/jap_ridetube/source, in English (the tests read the English texts; Russian is
# checked by the test's own pass over locale-ru.json).
#   sh tools/stage_for_tests.sh [published jap_ridetube@0.3.8.tgz]      (default dist/upstream/jap_ridetube@0.3.8.tgz)
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
cd "$here"
up=${1:-dist/upstream/jap_ridetube@0.3.8.tgz}
v=$(python3 -c "import json;print(json.load(open('apps/jap_ridetube/app.json'))['version'])")
python3 tools/patch_app.py "$up"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
tar xzf "dist/jap_ridetube@$v.tgz" -C "$tmp"
rm -rf dist/jap_ridetube
mkdir -p dist/jap_ridetube/source
cp -R "$tmp"/package/* dist/jap_ridetube/source/
rm dist/jap_ridetube/source/javascript/ru.json
echo '{"language": "en", "strings": {}}' > dist/jap_ridetube/source/javascript/kit/locale.json
echo "staged $v in dist/jap_ridetube/source"
