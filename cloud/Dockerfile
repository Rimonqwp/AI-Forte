FROM python:3.10-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 OMP_NUM_THREADS=4
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install torch==2.0.1+cpu torchaudio==2.0.2+cpu --extra-index-url https://download.pytorch.org/whl/cpu && pip install -r requirements.txt
# Store model weights in the image so cold starts do not depend on a third-party server.
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"
COPY install_chordino.sh ./
RUN sh install_chordino.sh
ENV VAMP_PATH=/usr/local/lib/vamp
COPY main.py harmony.py intro.py ./
CMD exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8080}"
