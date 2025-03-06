#!/bin/sh

git checkout live && git merge main -m "release" && git push && git checkout main
