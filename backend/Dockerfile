FROM python:3.12-slim

WORKDIR /app

# ---------------------------------------------------------
# System + prebuilt R packages
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
    && rm -rf /var/lib/apt/lists/*

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