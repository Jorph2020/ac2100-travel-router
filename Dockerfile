FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
	bash \
	build-essential \
	bzip2 \
	ca-certificates \
	clang \
	curl \
	file \
	flex \
	g++ \
	g++-multilib \
	gawk \
	gcc-multilib \
	gettext \
	git \
	libelf-dev \
	libncurses-dev \
	libssl-dev \
	make \
	perl \
	python3 \
	python3-setuptools \
	rsync \
	swig \
	time \
	unzip \
	wget \
	zlib1g-dev \
	&& rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 builder

USER builder
WORKDIR /src

CMD ["./scripts/build.sh"]
