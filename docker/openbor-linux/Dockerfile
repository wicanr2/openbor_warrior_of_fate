FROM ubuntu:24.04@sha256:786a8b558f7be160c6c8c4a54f9a57274f3b4fb1491cf65146521ae77ff1dc54

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        cmake \
        file \
        git \
        zstd \
        yasm \
        libsdl2-dev \
        libsdl2-gfx-dev \
        libvorbis-dev \
        libogg-dev \
        libpng-dev \
        libvpx-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work
