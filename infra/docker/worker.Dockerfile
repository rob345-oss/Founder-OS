FROM python:3.11-slim

WORKDIR /app

COPY services/worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/worker/founder_os_worker ./founder_os_worker

ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "founder_os_worker"]
