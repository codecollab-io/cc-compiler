#!/bin/bash
set -e

to=$1
name=$2
shift
shift

$(docker run --rm "$@")

exiting() {
    docker rm --force $name &> /dev/null
    # docker rm $name &> /dev/null
    kill -- -$$
}

trap exiting SIGINT SIGTERM

code=$(gtimeout "$to" docker wait "$name" || true)
docker kill $name &> /dev/null
echo -n 'status: '
if [ -z "$code" ]; then
    echo timeout
else
    echo exited: $code
fi

echo output:
# pipe to sed simply for pretty nice indentation
docker logs $name | sed 's/^/\t/'

# docker rm $name &> /dev/null
