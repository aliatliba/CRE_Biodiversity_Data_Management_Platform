FROM python:3.12-slim

WORKDIR /app

# ---------------------------------------------------------
# System packages + R + R packages available via Debian
# ---------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
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
# R packages from CRAN / GitHub
# ---------------------------------------------------------
RUN Rscript -e 'install.packages(c("janitor", "remotes"), repos="https://cloud.r-project.org")' && \
    Rscript -e 'remotes::install_github("hrbrmstr/ggchicklet")'

# ggimage (family richness chart: PhyloPic silhouettes)
RUN Rscript -e 'install.packages("ggimage", repos="https://cloud.r-project.org", Ncpus=2)'

# ---------------------------------------------------------
# Fail the build if any package needed by the R scripts is missing
# (install.packages only warns, so without this the error
#  would only appear later, when a graphic is generated)
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

RUN chmod +x start.sh

# ---------------------------------------------------------
# Application user
# ---------------------------------------------------------
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
