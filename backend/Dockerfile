FROM python:3.12-slim

WORKDIR /app

# ---------------------------------------------------------
# System packages + R + R packages available via Debian
# ---------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    ca-certificates \
    libpq-dev \
    r-base \
    r-base-dev \
    r-cran-readxl \
    r-cran-dplyr \
    r-cran-stringr \
    r-cran-ggplot2 \
    r-cran-ggraph \
    r-cran-igraph \
    r-cran-scales \
    r-cran-writexl \
    r-cran-jsonlite \
    r-cran-httr2 \
    r-cran-magick \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libfontconfig1-dev \
    libfreetype6-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libpng-dev \
    libtiff-dev \
    libjpeg-dev \
    libmagick++-dev \
    libuv1-dev \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# R packages from CRAN
# ---------------------------------------------------------
RUN Rscript -e 'options(timeout=600); install.packages("janitor", repos="https://cloud.r-project.org")'

# ---------------------------------------------------------
# ggchicklet (GitHub only, not on CRAN)
# Downloaded with curl (retries + generous timeouts) instead of
# remotes::install_github(), which timed out on the GitHub API.
# ---------------------------------------------------------
RUN curl -fsSL --retry 5 --retry-delay 10 --retry-all-errors \
      --connect-timeout 30 --max-time 300 \
      https://github.com/hrbrmstr/ggchicklet/archive/refs/heads/master.tar.gz \
      -o /tmp/ggchicklet.tar.gz && \
    R CMD INSTALL /tmp/ggchicklet.tar.gz && \
    rm -f /tmp/ggchicklet.tar.gz

# ggimage (family richness chart: PhyloPic silhouettes)
RUN Rscript -e 'options(timeout=600); install.packages("ggimage", repos="https://cloud.r-project.org", Ncpus=2)'

# ---------------------------------------------------------
# Fail the build if any package needed by the R scripts is missing
# ---------------------------------------------------------
RUN Rscript -e 'needed <- c("readxl","dplyr","stringr","janitor","ggplot2","ggraph","igraph","scales","writexl","ggchicklet","jsonlite","httr2","magick","ggimage"); missing <- setdiff(needed, rownames(installed.packages())); if (length(missing) > 0) stop("Missing R packages: ", paste(missing, collapse=", ")); cat("All R packages OK\n")'

# ---------------------------------------------------------
# Python dependencies
# ---------------------------------------------------------
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------
# Application
# ---------------------------------------------------------
COPY . .

# Strip Windows CRLF line endings (fixes "exec format error") and make executable
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# ---------------------------------------------------------
# Application user
# ---------------------------------------------------------
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Run through sh so it works even if the exec bit or line endings are off
CMD ["sh", "./start.sh"]
