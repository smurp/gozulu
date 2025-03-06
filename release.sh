#!/bin/sh

# Check if a commit message was provided
if [ $# -eq 0 ]; then
  # Default commit message if none provided
  COMMIT_MSG="release"
else
  # Use all arguments as the commit message
  COMMIT_MSG="$*"
fi

# Output what we're doing
echo "Releasing with commit message: \"$COMMIT_MSG\""

# Perform the release
git checkout live && git merge main -m "$COMMIT_MSG" && git push && git checkout main