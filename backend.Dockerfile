FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the app directory and input directory
COPY app/ ./app/

# Copy the chroma db directory if it exists
COPY app_chroma_db/ ./app_chroma_db/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
