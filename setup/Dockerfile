#
#   Created by Carl Voller.
#   Dockerfile to create ubuntu image to execute untrusted user code.
#   Currently supports 18 languages, change it as you wish to support
#   more or less languages.
#
#   Updated by Thinker Pal to migrate from Ubuntu 14.04 to 18.04
#   Updated by Carl Voller to migrate from Ubuntu 18.04 to 20.04 (15/12/20)
#   - Updated Python, PHP, Typescript, NodeJS, C#, GCC/G++, Scala, Kotlin, Golang, Ruby, Perl, Elixir
#

FROM ubuntu:focal
LABEL maintainer = "Carl Voller (carlvoller@codecollab.io) and Rui Yang (thinkerpal@codecollab.io)"

# Update the sources list and install standard packages.
RUN echo  "deb http://mirror.0x.sg/ubuntu focal main restricted universe multiverse" >> /etc/apt/sources.list
RUN echo  "deb http://mirror.0x.sg/ubuntu focal-updates main restricted universe multiverse" >> /etc/apt/sources.list
RUN echo  "deb http://mirror.0x.sg/ubuntu focal-backports main restricted universe multiverse" >> /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y dialog apt-utils

# Configure tzdata
ENV TZ=Asia/Singapore
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN ln -s /bin/true /bin/systemctl

# Installs system tools to allow other software/compilers to be installed
RUN apt-get install -y sudo bc build-essential unzip curl software-properties-common wget git cmake

# Install language compilers/interpreters
RUN apt-get update
RUN apt-get install -y ruby-full
RUN apt-get install -y golang-go
RUN apt-get install -y python2 python3.9 python2.7-dev python3.9-dev

# Installs Package Managers
RUN apt-get update
RUN apt-get install -y npm
RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
RUN curl https://bootstrap.pypa.io/get-pip.py --output get-pip.py
RUN python2 get-pip.py && rm get-pip.py
RUN apt-get install -y python3-pip

# Installs Mono for CSharp
RUN apt-get install -y dirmngr gnupg apt-transport-https ca-certificates
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 3FA7E0328081BFF6A14DA29AA6A19B38D3D831EF
RUN echo "deb https://download.mono-project.com/repo/ubuntu stable-focal main" > /etc/apt/sources.list.d/mono-official-stable.list
RUN apt-get update
RUN apt-get install -y mono-complete

# Installs NodeJS
RUN apt-get update
RUN apt-get install -y nodejs

# Adding Outside Repos for Installation
RUN add-apt-repository -y ppa:ubuntu-toolchain-r/test
RUN apt-get update

# Installs SQL, Perl and PHP7.3
RUN apt-get install -y mysql-server
RUN apt-get install -y perl
RUN apt-get install -y apache2
RUN apt-get install -y php php-cli php-fpm php-json php-common php-mysql php-zip php-gd php-mbstring php-curl php-xml php-pear php-bcmath

# Installs Clang and Unicode stuff
RUN apt-get install -y clang libicu-dev

# New Java compiler
RUN apt-get update
RUN apt-get install -y openjdk-11-jdk-headless

# Installs C/C++ Compiler (GCC & G++)
RUN apt-get install -y gcc
RUN apt-get install -y g++
RUN apt-get install -y gcc-8
RUN apt-get install -y g++-8

# Installs Scala
RUN apt-get install -y scala

# Installs Swift CLI
RUN wget https://swift.org/builds/swift-5.3.1-release/ubuntu2004/swift-5.3.1-RELEASE/swift-5.3.1-RELEASE-ubuntu20.04.tar.gz
RUN tar -xvzf swift-5.3.1-RELEASE-ubuntu20.04.tar.gz && mv swift-5.3.1-RELEASE-ubuntu20.04/ /swift/
RUN rm swift-5.3.1-RELEASE-ubuntu20.04.tar.gz
ENV PATH="/swift/usr/bin:${PATH}"

# Installs Kotlin
RUN wget https://github.com/JetBrains/kotlin/releases/download/v1.4.21/kotlin-compiler-1.4.21.zip --no-check-certificate
RUN unzip kotlin-compiler-1.4.21.zip -d kotlin
ENV PATH="/kotlin/kotlinc/bin:${PATH}"

# Final Setup and cleaning up
RUN echo "mysql ALL = NOPASSWD: /usr/sbin/service mysql start" | cat >> /etc/sudoers
RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get -y autoremove

# Install Erlang/Elixir
RUN wget -O- https://packages.erlang-solutions.com/ubuntu/erlang_solutions.asc | sudo apt-key add -
RUN echo "deb https://packages.erlang-solutions.com/ubuntu focal contrib" | sudo tee /etc/apt/sources.list.d/rabbitmq.list
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y erlang
RUN apt-get install -y elixir

# Installs npm packages for nodejs
RUN npm install -g ts-node underscore request express pug shelljs passport http sys jquery lodash async mocha moment connect validator restify ejs ws co when helmet wrench fs-extra brain mustache should backbone forever debug typescript coffeescript && \
export NODE_PATH=/usr/local/lib/node_modules/

# Installs Python PIP Packages
RUN python3.9 -m pip install numpy matplotlib pandas bs4 flask django pymongo pillow
RUN pip2 install numpy matplotlib scipy pandas scikit-learn bs4 flask django pymongo pillow

RUN cp -R /usr/include/python3.9/cpython /usr/include/cpython

# Makes all stderr red
RUN git clone git://github.com/sickill/stderred.git
RUN mv /stderred /err
RUN cd /err; make

# Setup custom python compilers
COPY tmp /tmp/
RUN cd /tmp; make; mv /bin/python3.9 /bin/python3.9-bin; mv /bin/python2.7 /bin/python2.7-bin; mv /tmp/python3.9 /bin/python3.9; mv /tmp/python2.7 /bin/python2.7;

# Set Locale to support Chinese/Japanese characters
RUN apt-get install -y locales
ENV LANG C.UTF-8  

# Create local user
RUN useradd -ms /bin/bash cc-user
USER cc-user
RUN /bin/bash -c "echo \"PS1='\[\033[1;3;31m\]>> \[\033[0m\]'\" >> /home/cc-user/.bashrc "
WORKDIR /home/cc-user
ENV LD_PRELOAD="/err/build/libstderred.so"
