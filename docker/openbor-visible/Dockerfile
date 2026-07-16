FROM openbor-linux-build:local

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        x11-utils \
        xdotool \
        xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work
