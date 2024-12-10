#!/bin/bash
set -euo pipefail

DOCKER_REPO="rorylshanks"
DOCKER_IMAGE_NAME="airbyte_exporter"
TARGET_ARCHS="linux/amd64,linux/arm64"

docker buildx build --platform ${TARGET_ARCHS} -t ${DOCKER_REPO}/${DOCKER_IMAGE_NAME}:latest --push .