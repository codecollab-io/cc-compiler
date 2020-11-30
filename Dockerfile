#
#   Created by Carl Voller.
#   Dockerfile to create ubuntu image to execute untrusted user code.
#   Currently supports 18 languages, change it as you wish to support
#   more or less languages.
#
#   Updated by Thinker Pal to migrate from Ubuntu 14.04 to 18.04
#

FROM ubuntu:bionic
LABEL maintainer = "Carl Voller (carlvoller@codecollab.io) and Rui Yang (thinkerpal@codecollab.io)"

# Update the sources list and install standard packages.
RUN echo  "deb http://mirror.0x.sg/ubuntu bionic main restricted universe multiverse" >> /etc/apt/sources.list
RUN echo  "deb http://mirror.0x.sg/ubuntu bionic-updates main restricted universe multiverse" >> /etc/apt/sources.list
RUN echo  "deb http://mirror.0x.sg/ubuntu bionic-backports main restricted universe multiverse" >> /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y dialog apt-utils

# Installs system tools to allow other software/compilers to be installed
RUN apt-get install -y sudo
RUN apt-get install -y bc
RUN apt-get install -y build-essential
RUN apt-get install -y unzip
RUN apt-get install -y software-properties-common

# Installs Package Managers
RUN apt-get update
RUN apt-get install -y npm
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN apt-get install -y python3-pip python-pip

# Install language compilers/interpreters
RUN apt-get update
RUN apt-get install -y ruby
RUN apt-get install -y golang-go
RUN apt-get install -y python
RUN apt-get install -y python3.7

# Installs Mono for CSharp
RUN apt-get install gnupg ca-certificates
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 3FA7E0328081BFF6A14DA29AA6A19B38D3D831EF
RUN echo "deb https://download.mono-project.com/repo/ubuntu stable-bionic main" | tee /etc/apt/sources.list.d/mono-official-stable.list
RUN apt-get update
RUN apt-get install -y mono-devel
RUN apt-get install -y mono-vbnc

# Installs NodeJS
RUN apt-get update
RUN apt-get install -y nodejs

# Installs Clojure
RUN curl -O https://download.clojure.org/install/linux-install-1.10.1.492.sh
RUN bash linux-install-1.10.1.492.sh

# Adding Outside Repos for Installation
RUN add-apt-repository -y ppa:ubuntu-toolchain-r/test
RUN apt-get update

# Installs SQL, Perl and PHP7.3
RUN apt-get update
RUN apt-get install -y mysql-server
RUN apt-get install -y perl
RUN apt-get install -y apache2
RUN DEBIAN_FRONTEND=noninteractive apt-get install -yq --force-yes php7.2

# Installs Clang and Unicode stuff
RUN apt-get install -y clang libicu-dev

# New Java compiler
RUN apt-get update
RUN apt-get install -y openjdk-11-jdk-headless

# Installs Objc Compiler
RUN apt-get install -y gobjc
RUN apt-get install -y gnustep-devel &&  sed -i 's/#define BASE_NATIVE_OBJC_EXCEPTIONS     1/#define BASE_NATIVE_OBJC_EXCEPTIONS     0/g' /usr/include/GNUstep/GNUstepBase/GSConfig.h

# Installs C/C++ Compiler (GCC & G++)
RUN apt-get install -y gcc
RUN apt-get install -y g++
RUN apt-get install -y gcc-8
RUN apt-get install -y g++-8

# Installs Scala
RUN apt-get install -y scala

# Installs wget
RUN apt-get install -y wget

# Installs Swift CLI
RUN wget https://swift.org/builds/swift-5.1.2-release/ubuntu1804/swift-5.1.2-RELEASE/swift-5.1.2-RELEASE-ubuntu18.04.tar.gz
RUN tar -xvzf swift-5.1.2-RELEASE-ubuntu18.04.tar.gz && mv /swift-5.1.2-RELEASE-ubuntu18.04/ /swift/
RUN rm /swift-5.1.2-RELEASE-ubuntu18.04.tar.gz
ENV PATH="/swift/usr/bin:${PATH}"

# Installs Kotlin
RUN wget https://github.com/JetBrains/kotlin/releases/download/v1.3.60/kotlin-compiler-1.3.60.zip --no-check-certificate
RUN unzip kotlin-compiler-1.3.60.zip -d kotlin
ENV PATH="/kotlin/kotlinc/bin:${PATH}"

# Final Setup and cleaning up
RUN echo "mysql ALL = NOPASSWD: /usr/sbin/service mysql start" | cat >> /etc/sudoers
RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get -y autoremove

# Installs npm packages for nodejs
RUN npm install -g underscore request express pug shelljs passport http sys jquery lodash async mocha moment connect validator restify ejs ws co when helmet wrench fs-extra brain mustache should backbone forever debug typescript coffeescript && \
export NODE_PATH=/usr/local/lib/node_modules/

# Installs Python PIP Packages
RUN python3.7 -m pip install numpy matplotlib scipy pandas scikit-learn bs4 flask django pymongo pillow
RUN pip install numpy matplotlib scipy pandas scikit-learn bs4 flask django pymongo pillow