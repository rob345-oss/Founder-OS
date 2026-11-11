FROM python:3.11-slim

WORKDIR /app

COPY services/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/api/founder_os_api ./founder_os_api

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "founder_os_api.app_factory:app", "--host", "0.0.0.0", "--port", "8000"]
